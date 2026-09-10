import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SCIS Staff Performance Evaluation System...');

  // 1. Initialize System Config
  const defaultCampuses = [
    'Systemwide',
    'Hongqiao Campus',
    'Hongqiao ECE',
    'Pudong Campus',
  ];
  const defaultDepartments = [
    'Technology and Innovation',
    'Early Childhood Education (ECE)',
    'Lower School / Primary',
    'Upper School / Secondary',
    'Student Support Services',
    'Operations & Facilities',
    'Human Resources',
    'Finance & Business Office',
    'Athletics & Activities',
    'Admissions & Marketing',
    'General Administration',
  ];

  const config = await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      isSimulationMode: false,
      simulatedDate: null,
      campusOptions: defaultCampuses,
      departmentOptions: defaultDepartments,
    },
  });

  // Ensure options are populated if singleton was created before this schema update
  if (!config.campusOptions || !config.departmentOptions) {
    await prisma.systemConfig.update({
      where: { id: 'singleton' },
      data: {
        campusOptions: config.campusOptions || defaultCampuses,
        departmentOptions: config.departmentOptions || defaultDepartments,
      },
    });
  }
  console.log('✓ System config initialized.');

  // 2. Initialize School Year SY2627
  const sy2627 = await prisma.schoolYear.upsert({
    where: { code: 'SY2627' },
    update: {},
    create: {
      code: 'SY2627',
      name: 'School Year 2026 - 2027',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2027-06-30T23:59:59.000Z'),
      isCurrent: true,
      phase1StartDate: new Date('2026-09-15T00:00:00.000Z'),
      phase1EndDate: new Date('2026-10-15T23:59:59.000Z'),
      phase2StartDate: new Date('2027-01-10T00:00:00.000Z'),
      phase2EndDate: new Date('2027-01-25T23:59:59.000Z'),
      phase3StartDate: new Date('2027-04-01T00:00:00.000Z'),
      phase3EndDate: new Date('2027-04-30T23:59:59.000Z'),
    },
  });
  console.log('✓ School Year SY2627 created.');

  // Update active school year in config
  await prisma.systemConfig.update({
    where: { id: 'singleton' },
    data: { activeSchoolYearId: sy2627.id },
  });

  // 3. Seed Super Admin User (zren@scis-china.org)
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'zren@scis-china.org' },
    update: {
      name: 'Zhengyu Ren',
      role: Role.SUPER_ADMIN,
    },
    create: {
      email: 'zren@scis-china.org',
      name: 'Zhengyu Ren',
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.staffProfile.upsert({
    where: { email: 'zren@scis-china.org' },
    update: {
      fullName: 'Zhengyu Ren',
      department: 'Technology and Innovation',
      campus: 'Systemwide',
    },
    create: {
      userId: superAdminUser.id,
      fullName: 'Zhengyu Ren',
      email: 'zren@scis-china.org',
      campus: 'Systemwide',
      department: 'Technology and Innovation',
    },
  });
  console.log('✓ Super Admin created/updated: Zhengyu Ren (zren@scis-china.org)');

  console.log('Seeding complete successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
