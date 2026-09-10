'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, logAudit } from '@/lib/db';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const COOKIE_NAME = 'scis_impersonate_staff_id';

/**
 * Start impersonating a staff member within caller's purview
 */
export async function startImpersonationAction(targetStaffId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const callerUser = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { staffProfile: true },
  });
  if (!callerUser) throw new Error('Caller user not found');

  const targetStaff = await prisma.staffProfile.findUnique({
    where: { id: targetStaffId },
    include: { user: true },
  });
  if (!targetStaff) throw new Error('Target staff not found');

  const callerRole = callerUser.role;
  const isSuperOrHR = callerRole === 'SUPER_ADMIN' || callerRole === 'HR_ADMIN';
  const isDirectSupervisor =
    callerUser.staffProfile && targetStaff.supervisorId === callerUser.staffProfile.id;
  const isDeptHead =
    callerUser.staffProfile && targetStaff.deptHeadId === callerUser.staffProfile.id;

  if (!isSuperOrHR && !isDirectSupervisor && !isDeptHead) {
    throw new Error('You do not have permission to impersonate this employee.');
  }

  // Set the cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, targetStaffId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours
  });

  await logAudit({
    userId: callerUser.id,
    userEmail: callerUser.email,
    userName: callerUser.name,
    action: 'IMPERSONATION_STARTED',
    entityType: 'StaffProfile',
    entityId: targetStaffId,
    diffData: {
      impersonatorEmail: callerUser.email,
      impersonatorRole: callerRole,
      targetEmail: targetStaff.email,
      targetName: targetStaff.fullName,
    },
  });

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Stop impersonation and return to normal account
 */
export async function stopImpersonationAction() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const currentTargetId = cookieStore.get(COOKIE_NAME)?.value;

  if (session?.user?.email && currentTargetId) {
    await logAudit({
      userId: (session.user as any).id,
      userEmail: session.user.email,
      userName: (session.user as any).fullName || session.user.name,
      action: 'IMPERSONATION_ENDED',
      entityType: 'StaffProfile',
      entityId: currentTargetId,
      diffData: {
        stoppedBy: session.user.email,
      },
    });
  }

  cookieStore.delete(COOKIE_NAME);
  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Retrieve the effective user & staff profile, accounting for active impersonation
 */
export async function getEffectiveSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const realUser = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: {
      staffProfile: {
        include: {
          jobDescription: true,
          supervisor: true,
          deptHead: true,
        },
      },
    },
  });

  if (!realUser) return null;

  const cookieStore = await cookies();
  const impersonateStaffId = cookieStore.get(COOKIE_NAME)?.value;

  if (!impersonateStaffId) {
    return {
      user: realUser,
      staffProfile: realUser.staffProfile,
      isImpersonating: false,
      realUser: null,
    };
  }

  // Verify purview
  const targetStaff = await prisma.staffProfile.findUnique({
    where: { id: impersonateStaffId },
    include: {
      user: true,
      jobDescription: true,
      supervisor: true,
      deptHead: true,
    },
  });

  if (!targetStaff) {
    return {
      user: realUser,
      staffProfile: realUser.staffProfile,
      isImpersonating: false,
      realUser: null,
    };
  }

  const callerRole = realUser.role;
  const isSuperOrHR = callerRole === 'SUPER_ADMIN' || callerRole === 'HR_ADMIN';
  const isDirectSupervisor =
    realUser.staffProfile && targetStaff.supervisorId === realUser.staffProfile.id;
  const isDeptHead =
    realUser.staffProfile && targetStaff.deptHeadId === realUser.staffProfile.id;

  if (!isSuperOrHR && !isDirectSupervisor && !isDeptHead) {
    // Revoke invalid impersonation
    cookieStore.delete(COOKIE_NAME);
    return {
      user: realUser,
      staffProfile: realUser.staffProfile,
      isImpersonating: false,
      realUser: null,
    };
  }

  return {
    user: {
      ...targetStaff.user,
      staffProfile: targetStaff,
    },
    staffProfile: targetStaff,
    isImpersonating: true,
    realUser: {
      id: realUser.id,
      email: realUser.email,
      name: realUser.name,
      role: realUser.role,
    },
  };
}
