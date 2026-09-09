import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SCIS Staff Performance Evaluation System...');

  // 1. Initialize System Config
  const config = await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      isSimulationMode: false,
      simulatedDate: null,
    },
  });
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
      role: Role.SUPER_ADMIN,
    },
    create: {
      email: 'zren@scis-china.org',
      name: 'Zren (Super Admin)',
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.staffProfile.upsert({
    where: { email: 'zren@scis-china.org' },
    update: {
      fullName: 'Zren Admin',
      department: 'Administration',
      campus: 'Systemwide',
    },
    create: {
      userId: superAdminUser.id,
      fullName: 'Zren Admin',
      email: 'zren@scis-china.org',
      campus: 'Systemwide',
      department: 'Administration',
    },
  });
  console.log('✓ Super Admin created: zren@scis-china.org');

  // 4. Seed Sample Job Description: Apple Hardware Specialist
  const sampleJD = await prisma.jobDescription.upsert({
    where: { title: 'Apple Hardware Specialist' },
    update: {},
    create: {
      title: 'Apple Hardware Specialist',
      reportsTo: 'Director of Technology and Innovation',
      positionSummary:
        'The Apple Hardware Specialist is responsible for diagnosing, repairing, maintaining, and deploying Apple hardware and accessories across all SCIS campuses, ensuring maximum uptime and reliability for students and instructional staff.',
      responsibilities: [
        'Diagnose and perform hardware and component-level repairs on Apple devices (MacBooks, iPads, iMacs, and peripherals).',
        'Coordinate warranty claims and Apple Authorized Service Provider (AASP) logistics and escalations.',
        'Manage device lifecycle, parts inventory, staging, imaging, and distribution across campuses.',
        'Provide Level 2/3 hardware troubleshooting support to school technicians and faculty.',
        'Maintain accurate maintenance logs, repair records, and asset management in the school ticketing system.',
        'Assist with summer device refresh, return collections, and new academic year deployments.',
        'Train IT interns and junior tech support staff on Apple hardware best practices and safety procedures.',
        'Audit hardware health and generate quarterly component failure and turnaround time reports.',
      ],
      skillsAttributes: [
        'Apple Certified Mac Technician (ACMT) or equivalent practical experience.',
        'Strong diagnostic and manual dexterity skills for micro-soldering and delicate hardware assembly.',
        'Proactive communication skills and patient customer service attitude with school staff.',
        'Meticulous organizational skills in tracking inventory and spare parts.',
      ],
      qualifications: [
        'Associate or Bachelor’s degree in Computer Science, Information Technology, or relevant technical field.',
        'Minimum 3 years of hands-on experience in Apple device hardware repair and fleet deployment.',
        'Proficiency with macOS, iOS, Apple Configurator, and Jamf Pro Mobile Device Management (MDM).',
      ],
      fixedFooterText:
        'Shanghai Community International School is committed to safeguarding and promoting the welfare of children. All employees must pass comprehensive criminal record checks.',
      lastRevisedDate: new Date('2026-06-01'),
    },
  });
  console.log('✓ Sample Job Description created: Apple Hardware Specialist');

  // 5. Seed Test Supervisor and Test Department Head
  const supervisorUser = await prisma.user.upsert({
    where: { email: 'supervisor.tech@scis-china.org' },
    update: { role: Role.SUPERVISOR },
    create: {
      email: 'supervisor.tech@scis-china.org',
      name: 'Alex Johnson',
      role: Role.SUPERVISOR,
    },
  });

  const supervisorProfile = await prisma.staffProfile.upsert({
    where: { email: 'supervisor.tech@scis-china.org' },
    update: {},
    create: {
      userId: supervisorUser.id,
      fullName: 'Alex Johnson',
      email: 'supervisor.tech@scis-china.org',
      campus: 'Systemwide',
      department: 'Technology and Innovation',
    },
  });

  const deptHeadUser = await prisma.user.upsert({
    where: { email: 'director.tech@scis-china.org' },
    update: { role: Role.DEPT_HEAD },
    create: {
      email: 'director.tech@scis-china.org',
      name: 'Sarah Connor',
      role: Role.DEPT_HEAD,
    },
  });

  const deptHeadProfile = await prisma.staffProfile.upsert({
    where: { email: 'director.tech@scis-china.org' },
    update: {},
    create: {
      userId: deptHeadUser.id,
      fullName: 'Sarah Connor',
      email: 'director.tech@scis-china.org',
      campus: 'Systemwide',
      department: 'Technology and Innovation',
    },
  });

  // 6. Seed Sample Staff Member: Harry Huang (matching the sample image)
  const staffUser = await prisma.user.upsert({
    where: { email: 'hhuang@scis-china.org' },
    update: { role: Role.STAFF },
    create: {
      email: 'hhuang@scis-china.org',
      name: 'Harry Huang',
      role: Role.STAFF,
    },
  });

  const staffProfile = await prisma.staffProfile.upsert({
    where: { email: 'hhuang@scis-china.org' },
    update: {
      jobDescriptionId: sampleJD.id,
      supervisorId: supervisorProfile.id,
      deptHeadId: deptHeadProfile.id,
    },
    create: {
      userId: staffUser.id,
      fullName: 'Harry Huang',
      email: 'hhuang@scis-china.org',
      campus: 'Systemwide',
      department: 'Technology and Innovation',
      jobDescriptionId: sampleJD.id,
      supervisorId: supervisorProfile.id,
      deptHeadId: deptHeadProfile.id,
    },
  });
  console.log('✓ Sample Staff Member created: Harry Huang');

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
