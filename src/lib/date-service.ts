import { prisma } from './db';
import { SchoolYear } from '@prisma/client';

export interface CurrentPhaseInfo {
  phase: 1 | 2 | 3 | null;
  phaseName: string;
  isOpen: boolean;
  effectiveDate: Date;
  isSimulationMode: boolean;
}

/**
 * Returns the current effective date (either the real server clock or the admin-configured simulated date)
 */
export async function getEffectiveDate(): Promise<{ date: Date; isSimulated: boolean }> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (config?.isSimulationMode && config.simulatedDate) {
      return {
        date: new Date(config.simulatedDate),
        isSimulated: true,
      };
    }
  } catch (err) {
    console.error('Error fetching system config date:', err);
  }

  return {
    date: new Date(),
    isSimulated: false,
  };
}

/**
 * Determine which evaluation phase is active for a given school year
 */
export function calculatePhase(
  schoolYear: SchoolYear,
  effectiveDate: Date,
  isSimulated = false
): CurrentPhaseInfo {
  const time = effectiveDate.getTime();

  const p1Start = new Date(schoolYear.phase1StartDate).getTime();
  const p1End = new Date(schoolYear.phase1EndDate).getTime();

  const p2Start = new Date(schoolYear.phase2StartDate).getTime();
  const p2End = new Date(schoolYear.phase2EndDate).getTime();

  const p3Start = new Date(schoolYear.phase3StartDate).getTime();
  const p3End = new Date(schoolYear.phase3EndDate).getTime();

  if (time >= p1Start && time <= p1End) {
    return {
      phase: 1,
      phaseName: 'Phase 1: Goal & Responsibility Setting',
      isOpen: true,
      effectiveDate,
      isSimulationMode: isSimulated,
    };
  }

  if (time >= p2Start && time <= p2End) {
    return {
      phase: 2,
      phaseName: 'Phase 2: Mid-Year Review',
      isOpen: true,
      effectiveDate,
      isSimulationMode: isSimulated,
    };
  }

  if (time >= p3Start && time <= p3End) {
    return {
      phase: 3,
      phaseName: 'Phase 3: Final Review and Submission',
      isOpen: true,
      effectiveDate,
      isSimulationMode: isSimulated,
    };
  }

  return {
    phase: null,
    phaseName: 'Evaluation Window Closed (Read Only)',
    isOpen: false,
    effectiveDate,
    isSimulationMode: isSimulated,
  };
}

/**
 * Helper to get the full current phase status for the active school year
 */
export async function getActiveSchoolYearWithPhase() {
  const { date: effectiveDate, isSimulated } = await getEffectiveDate();

  const activeSchoolYear = await prisma.schoolYear.findFirst({
    where: { isCurrent: true },
  });

  if (!activeSchoolYear) {
    return {
      schoolYear: null,
      phaseInfo: {
        phase: null,
        phaseName: 'No Active School Year Configured',
        isOpen: false,
        effectiveDate,
        isSimulationMode: isSimulated,
      },
    };
  }

  const phaseInfo = calculatePhase(activeSchoolYear, effectiveDate, isSimulated);

  return {
    schoolYear: activeSchoolYear,
    phaseInfo,
  };
}
