import { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import { Role } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            tenantId: process.env.AZURE_AD_TENANT_ID,
          }),
        ]
      : []),

    // Development & testing fallback provider to allow testing all roles
    CredentialsProvider({
      id: 'dev-login',
      name: 'Development Quick Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'zren@scis-china.org' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const normalizedEmail = credentials.email.trim().toLowerCase();

        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { staffProfile: true },
        });

        if (!user) {
          // If super admin email
          const isSuper =
            normalizedEmail === (process.env.INITIAL_SUPER_ADMIN_EMAIL || 'zren@scis-china.org').toLowerCase();

          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: normalizedEmail.split('@')[0],
              role: isSuper ? Role.SUPER_ADMIN : Role.STAFF,
            },
            include: { staffProfile: true },
          });

          // Also create default staff profile
          await prisma.staffProfile.create({
            data: {
              userId: user.id,
              fullName: user.name || normalizedEmail.split('@')[0],
              email: normalizedEmail,
              campus: 'Systemwide',
              department: isSuper ? 'Administration' : 'General Staff',
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const normalizedEmail = user.email.trim().toLowerCase();

      // Check if super admin
      const isSuper =
        normalizedEmail === (process.env.INITIAL_SUPER_ADMIN_EMAIL || 'zren@scis-china.org').toLowerCase();

      // Upsert database user
      const dbUser = await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: {
          name: user.name ?? undefined,
          ...(isSuper ? { role: Role.SUPER_ADMIN } : {}),
        },
        create: {
          email: normalizedEmail,
          name: user.name,
          role: isSuper ? Role.SUPER_ADMIN : Role.STAFF,
        },
      });

      // Ensure staff profile exists
      let profile = await prisma.staffProfile.findUnique({
        where: { userId: dbUser.id },
      });

      if (!profile) {
        await prisma.staffProfile.create({
          data: {
            userId: dbUser.id,
            fullName: user.name || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            campus: 'Systemwide',
            department: isSuper ? 'Administration' : 'General Staff',
          },
        });
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email.toLowerCase() },
          include: { staffProfile: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.staffProfileId = dbUser.staffProfile?.id;
          token.campus = dbUser.staffProfile?.campus;
          token.department = dbUser.staffProfile?.department;
          token.fullName = dbUser.staffProfile?.fullName || dbUser.name;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).staffProfileId = token.staffProfileId;
        (session.user as any).campus = token.campus;
        (session.user as any).department = token.department;
        (session.user as any).fullName = token.fullName;
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET || 'scis-perf-eval-local-dev-secret-key-12345',
};
