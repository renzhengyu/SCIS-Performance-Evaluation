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

import { DEFAULT_CAMPUSES, DEFAULT_DEPARTMENTS } from '@/lib/org-constants';

export async function getOrgOptionsAction(): Promise<{
  success: boolean;
  campuses: string[];
  departments: string[];
  error?: string;
}> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'singleton' },
    });

    const campuses: string[] =
      Array.isArray(config?.campusOptions) && (config.campusOptions as string[]).length > 0
        ? (config.campusOptions as string[])
        : DEFAULT_CAMPUSES;

    const departments: string[] =
      Array.isArray(config?.departmentOptions) && (config.departmentOptions as string[]).length > 0
        ? (config.departmentOptions as string[])
        : DEFAULT_DEPARTMENTS;

    return { success: true, campuses, departments };
  } catch (err: any) {
    console.error('getOrgOptionsAction failed:', err);
    return {
      success: false,
      campuses: DEFAULT_CAMPUSES,
      departments: DEFAULT_DEPARTMENTS,
      error: err.message || 'Failed to load options',
    };
  }
}

export async function updateOrgOptionsAction(payload: {
  campuses: string[];
  departments: string[];
  renames?: {
    type: 'campus' | 'department';
    oldName: string;
    newName: string;
  }[];
}): Promise<{
  success: boolean;
  campuses?: string[];
  departments?: string[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: 'Unauthorized. Please sign in again.' };
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
      return { success: false, error: 'Forbidden: Super Admin or HR Admin permission required.' };
    }

    const cleanCampuses = Array.from(
      new Set((payload.campuses || []).map((c) => c.trim()).filter((c) => c.length > 0))
    );
    const cleanDepartments = Array.from(
      new Set((payload.departments || []).map((d) => d.trim()).filter((d) => d.length > 0))
    );

    if (cleanCampuses.length === 0) {
      return { success: false, error: 'You must have at least one campus option.' };
    }
    if (cleanDepartments.length === 0) {
      return { success: false, error: 'You must have at least one department option.' };
    }

    await prisma.systemConfig.upsert({
      where: { id: 'singleton' },
      update: {
        campusOptions: cleanCampuses,
        departmentOptions: cleanDepartments,
      },
      create: {
        id: 'singleton',
        campusOptions: cleanCampuses,
        departmentOptions: cleanDepartments,
      },
    });

    // If any items were renamed, update staff profiles who had the old name
    if (payload.renames && payload.renames.length > 0) {
      for (const r of payload.renames) {
        if (r.oldName && r.newName && r.oldName !== r.newName) {
          if (r.type === 'campus') {
            await prisma.staffProfile.updateMany({
              where: { campus: r.oldName },
              data: { campus: r.newName },
            });
          } else if (r.type === 'department') {
            await prisma.staffProfile.updateMany({
              where: { department: r.oldName },
              data: { department: r.newName },
            });
          }
        }
      }
    }

    await logAudit({
      userId: (session.user as any).id,
      userEmail: session.user.email,
      userName: (session.user as any).fullName || session.user.name,
      action: 'ORG_OPTIONS_UPDATED',
      entityType: 'SystemConfig',
      entityId: 'singleton',
      diffData: {
        campusCount: cleanCampuses.length,
        departmentCount: cleanDepartments.length,
        renamesCount: payload.renames?.length || 0,
      },
    });

    return {
      success: true,
      campuses: cleanCampuses,
      departments: cleanDepartments,
    };
  } catch (err: any) {
    console.error('updateOrgOptionsAction error:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while saving organization options.',
    };
  }
}

