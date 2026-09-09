'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, logAudit } from '@/lib/db';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function updateStaffProfileAction(
  profileId: string,
  payload: {
    fullName: string;
    campus: string;
    department: string;
    jobDescriptionId?: string | null;
    supervisorId?: string | null;
    deptHeadId?: string | null;
    role: Role;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    throw new Error('Forbidden: HR or Super Admin required');
  }

  const existingProfile = await prisma.staffProfile.findUnique({
    where: { id: profileId },
    include: { user: true },
  });
  if (!existingProfile) throw new Error('Staff profile not found');

  // Update profile
  const updatedProfile = await prisma.staffProfile.update({
    where: { id: profileId },
    data: {
      fullName: payload.fullName.trim(),
      campus: payload.campus,
      department: payload.department,
      jobDescriptionId: payload.jobDescriptionId || null,
      supervisorId: payload.supervisorId || null,
      deptHeadId: payload.deptHeadId || null,
    },
  });

  // Update role on user
  await prisma.user.update({
    where: { id: existingProfile.userId },
    data: { role: payload.role },
  });

  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: 'STAFF_PROFILE_UPDATED',
    entityType: 'StaffProfile',
    entityId: profileId,
    diffData: {
      fullName: payload.fullName,
      campus: payload.campus,
      department: payload.department,
      role: payload.role,
    },
  });

  revalidatePath('/admin/staff');
  return { success: true };
}

export async function createStaffProfileAction(payload: {
  fullName: string;
  email: string;
  campus: string;
  department: string;
  jobDescriptionId?: string | null;
  supervisorId?: string | null;
  deptHeadId?: string | null;
  role: Role;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    throw new Error('Forbidden');
  }

  const normalizedEmail = payload.email.trim().toLowerCase();

  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: payload.fullName.trim(),
        role: payload.role,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: payload.role },
    });
  }

  const profile = await prisma.staffProfile.create({
    data: {
      userId: user.id,
      fullName: payload.fullName.trim(),
      email: normalizedEmail,
      campus: payload.campus,
      department: payload.department,
      jobDescriptionId: payload.jobDescriptionId || null,
      supervisorId: payload.supervisorId || null,
      deptHeadId: payload.deptHeadId || null,
    },
  });

  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: 'STAFF_PROFILE_CREATED',
    entityType: 'StaffProfile',
    entityId: profile.id,
    diffData: { email: normalizedEmail, fullName: payload.fullName },
  });

  revalidatePath('/admin/staff');
  return { success: true, id: profile.id };
}

export async function deleteStaffProfileAction(profileId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    throw new Error('Forbidden: HR or Super Admin required');
  }

  const profile = await prisma.staffProfile.findUnique({
    where: { id: profileId },
    include: { user: true },
  });
  if (!profile) throw new Error('Staff profile not found');

  if (profile.email.toLowerCase() === session.user.email.toLowerCase()) {
    throw new Error('You cannot delete your own account.');
  }

  if (
    profile.email.toLowerCase() ===
    (process.env.INITIAL_SUPER_ADMIN_EMAIL || 'zren@scis-china.org').toLowerCase()
  ) {
    throw new Error('Cannot delete the root super administrator account.');
  }

  // Record audit log before deletion
  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: 'STAFF_PROFILE_DELETED',
    entityType: 'StaffProfile',
    entityId: profileId,
    diffData: {
      fullName: profile.fullName,
      email: profile.email,
      department: profile.department,
      campus: profile.campus,
    },
  });

  // Delete staff profile
  await prisma.staffProfile.delete({
    where: { id: profileId },
  });

  // Also delete associated User account if exists
  if (profile.userId) {
    await prisma.user
      .delete({
        where: { id: profile.userId },
      })
      .catch(() => null);
  }

  revalidatePath('/admin/staff');
  return { success: true };
}
