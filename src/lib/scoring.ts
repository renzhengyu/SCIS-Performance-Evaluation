export interface SkillRubric {
  key: string;
  name: string;
  rubrics: {
    [score: number]: string;
  };
}

export const SKILL_RUBRICS: SkillRubric[] = [
  {
    key: 'COMMUNICATION',
    name: 'Communication Skills',
    rubrics: {
      5: 'Exceptional communicator; consistently clear, articulate, and persuasive',
      4: 'Communicates effectively; generally clear and articulate',
      3: 'Communicates adequately; clarity and understanding may vary',
      2: 'Communicates with difficulty; often unclear or lacks depth',
      1: 'Unable to communicate effectively; consistently unclear or misunderstood',
    },
  },
  {
    key: 'PROBLEM_SOLVING',
    name: 'Problem-Solving',
    rubrics: {
      5: 'Excels at problem-solving; consistently identifies root causes and implements innovative solutions',
      4: 'Analyzes problems effectively; generates creative solutions independently or collaboratively',
      3: 'Capable of analyzing problems; proposing solutions with guidance',
      2: 'Identifies basic problems but struggles to propose effective solutions independently',
      1: 'Unable to identify or address problems effectively; relies heavily on others for solutions',
    },
  },
  {
    key: 'TEAMWORK',
    name: 'Teamwork',
    rubrics: {
      5: 'Exceptional team player; fosters synergy and collaboration; resolves conflicts effectively',
      4: 'Works effectively with others; fosters collaboration and supports team goals',
      3: 'Usually works well with others to achieve team objectives; contributes ideas and supports team members',
      2: 'Occasionally cooperates with the team but struggles to work effectively with others',
      1: 'Rarely collaborates with team members or contributes to team efforts; often disrupts team dynamics',
    },
  },
  {
    key: 'DECISION_MAKING',
    name: 'Decision Making',
    rubrics: {
      5: 'Exceptional decision-maker; consistently makes strategic and well-thought-out decisions; anticipates and mitigates risks effectively',
      4: 'Makes informed decisions; considers various factors and consequences effectively',
      3: 'Generally makes good decisions based on available information; demonstrates basic critical thinking skills',
      2: 'Occasionally makes sound decisions but may struggle with complex situations',
      1: 'Makes poor decisions that result in negative outcomes; lacks critical thinking skills',
    },
  },
];

export interface GradeInfo {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;
  rangeText: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export function calculateGrade(totalScore: number): GradeInfo {
  if (totalScore >= 90) {
    return {
      grade: 'A',
      label: 'Outstanding',
      rangeText: '90 - 100',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-500',
    };
  }
  if (totalScore >= 80) {
    return {
      grade: 'B',
      label: 'Exceeds Expectation',
      rangeText: '80 - 89',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      borderClass: 'border-blue-500',
    };
  }
  if (totalScore >= 70) {
    return {
      grade: 'C',
      label: 'Meets Expectation',
      rangeText: '70 - 79',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
      bgClass: 'bg-slate-50',
      textClass: 'text-slate-700',
      borderClass: 'border-slate-400',
    };
  }
  if (totalScore >= 60) {
    return {
      grade: 'D',
      label: 'Needs Improvement',
      rangeText: '60 - 69',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-500',
    };
  }
  return {
    grade: 'E',
    label: 'Not Suitable for current role',
    rangeText: '< 60',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-500',
  };
}
