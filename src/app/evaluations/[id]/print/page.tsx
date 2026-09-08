import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { SKILL_RUBRICS, calculateGrade } from '@/lib/scoring';
import { ItemType } from '@prisma/client';

export default async function PrintEvaluationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ timestamp?: string; downloader?: string }>;
}) {
  const { id } = await params;
  const search = searchParams ? await searchParams : {};

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      schoolYear: true,
      staffProfile: {
        include: {
          jobDescription: true,
          supervisor: true,
          deptHead: true,
        },
      },
      supervisor: true,
      deptHead: true,
      items: {
        orderBy: { orderIndex: 'asc' },
      },
      goals: {
        orderBy: { goalIndex: 'asc' },
      },
    },
  });

  if (!evaluation) {
    notFound();
  }

  const responsibilities = evaluation.items.filter((i) => i.itemType === ItemType.RESPONSIBILITY);
  const skills = evaluation.items.filter((i) => i.itemType === ItemType.SKILL);

  const totalPartASelf = responsibilities.reduce((sum, r) => sum + (r.scoreSelf || 0), 0);
  const totalPartASupervisor = responsibilities.reduce((sum, r) => sum + (r.scoreSupervisor || 0), 0);

  const totalPartBSelf = skills.reduce((sum, s) => sum + (s.scoreSelf || 0), 0);
  const totalPartBSupervisor = skills.reduce((sum, s) => sum + (s.scoreSupervisor || 0), 0);

  const totalSelf = totalPartASelf + totalPartBSelf;
  const totalSupervisor = totalPartASupervisor + totalPartBSupervisor;

  const gradeInfo = calculateGrade(totalSupervisor);

  const downloadTime = search?.timestamp || new Date().toISOString();
  const downloaderName = search?.downloader || 'System User';

  return (
    <div className="bg-white text-slate-900 font-sans print:p-0 print:m-0 max-w-[210mm] mx-auto min-h-screen">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
        table, th, td {
          border-collapse: collapse;
        }
      `}</style>

      {/* ========================================================
          PAGE 1 OF 2
          ======================================================== */}
      <div className="page-break flex flex-col justify-between" style={{ minHeight: '275mm' }}>
        <div>
          {/* Header with School Branding */}
          <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-2 mb-2">
            <div className="w-12 h-12 flex-shrink-0 bg-[#0B2341] text-white flex items-center justify-center font-bold text-base rounded">
              SCIS
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-[#0B2341] leading-tight font-serif">
                Shanghai Community International School
              </div>
              <div className="text-sm font-semibold text-slate-700">
                上海长宁国际外籍人员子女学校
              </div>
            </div>
          </div>

          <div className="text-center my-2">
            <h1 className="text-lg font-bold tracking-wide text-slate-900 uppercase">
              Performance Evaluation
            </h1>
            <div className="text-xs font-semibold text-slate-700">
              School Year: {evaluation.schoolYear.code.replace('SY', '')}
            </div>
          </div>

          {/* Employee Metadata Info Table */}
          <table className="w-full border border-slate-800 text-xs mb-3">
            <tbody>
              <tr>
                <td className="border border-slate-800 bg-slate-100 p-1.5 font-bold w-20">Name:</td>
                <td className="border border-slate-800 p-1.5 font-semibold text-slate-900">{evaluation.staffNameSnapshot}</td>
                <td className="border border-slate-800 bg-slate-100 p-1.5 font-bold w-20">Position:</td>
                <td className="border border-slate-800 p-1.5 font-semibold text-slate-900">{evaluation.jobTitleSnapshot}</td>
              </tr>
              <tr>
                <td className="border border-slate-800 bg-slate-100 p-1.5 font-bold">Campus:</td>
                <td className="border border-slate-800 p-1.5">{evaluation.campusSnapshot}</td>
                <td className="border border-slate-800 bg-slate-100 p-1.5 font-bold">Department:</td>
                <td className="border border-slate-800 p-1.5">{evaluation.departmentSnapshot}</td>
              </tr>
            </tbody>
          </table>

          {/* Section A: Responsibilities */}
          <div className="mb-3">
            <div className="bg-[#D9E1F2] border border-slate-800 px-2 py-1 text-xs font-bold text-slate-900">
              A. Responsibilities.{' '}
              <span className="font-normal text-[11px]">
                List between 4-8 of the most pressing responsibilities found in the employees' job description. Score each item. No one item to exceed a score of 20. Maximum total score across all items is 80. Please ratio scores accordingly. (Higher score indicates better performance)
              </span>
            </div>
            <table className="w-full border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className="border border-slate-800 p-1 text-left">Responsibility</th>
                  <th className="border border-slate-800 p-1 w-24">Score (Set by supervisor)</th>
                  <th className="border border-slate-800 p-1 w-16">Self</th>
                  <th className="border border-slate-800 p-1 w-20">Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {responsibilities.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="border border-slate-800 p-1 text-[11px] leading-tight">
                      {item.title}
                    </td>
                    <td className="border border-slate-800 p-1 text-center font-bold">{item.weight}</td>
                    <td className="border border-slate-800 p-1 text-center">{item.scoreSelf ?? ''}</td>
                    <td className="border border-slate-800 p-1 text-center font-semibold">{item.scoreSupervisor ?? ''}</td>
                  </tr>
                ))}
                {/* Blank rows if fewer than 8 responsibilities to keep stable table height */}
                {Array.from({ length: Math.max(0, 6 - responsibilities.length) }).map((_, i) => (
                  <tr key={`blank-${i}`} className="h-5">
                    <td className="border border-slate-800 p-1 text-slate-300 italic text-[10px]">&nbsp;</td>
                    <td className="border border-slate-800 p-1 text-center" />
                    <td className="border border-slate-800 p-1 text-center" />
                    <td className="border border-slate-800 p-1 text-center" />
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td className="border border-slate-800 p-1 text-right">Total Part A:</td>
                  <td className="border border-slate-800 p-1 text-center">80</td>
                  <td className="border border-slate-800 p-1 text-center">{totalPartASelf || ''}</td>
                  <td className="border border-slate-800 p-1 text-center">{totalPartASupervisor || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section B: Skills */}
          <div className="mb-3">
            <div className="bg-[#D9E1F2] border border-slate-800 px-2 py-1 text-xs font-bold text-slate-900">
              B. Skills.{' '}
              <span className="font-normal text-[11px]">Score each item out of 5. (See rubrics below)</span>
            </div>
            <table className="w-full border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className="border border-slate-800 p-1 text-left">Skill</th>
                  <th className="border border-slate-800 p-1 w-24">Score</th>
                  <th className="border border-slate-800 p-1 w-16">Self</th>
                  <th className="border border-slate-800 p-1 w-20">Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill, idx) => (
                  <tr key={skill.id || idx}>
                    <td className="border border-slate-800 p-1 font-semibold text-[11px]">{skill.title}</td>
                    <td className="border border-slate-800 p-1 text-center font-bold">5</td>
                    <td className="border border-slate-800 p-1 text-center">{skill.scoreSelf ?? ''}</td>
                    <td className="border border-slate-800 p-1 text-center font-semibold">{skill.scoreSupervisor ?? ''}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td className="border border-slate-800 p-1 text-right">Total Part B:</td>
                  <td className="border border-slate-800 p-1 text-center">20</td>
                  <td className="border border-slate-800 p-1 text-center">{totalPartBSelf || ''}</td>
                  <td className="border border-slate-800 p-1 text-center">{totalPartBSupervisor || ''}</td>
                </tr>
                {/* Total Score Row */}
                <tr className="bg-[#FCE4D6] font-bold text-slate-900">
                  <td className="border border-slate-800 p-1 text-right">Total Score: (Part A + Part B)</td>
                  <td className="border border-slate-800 p-1 text-center">100</td>
                  <td className="border border-slate-800 p-1 text-center">{totalSelf || ''}</td>
                  <td className="border border-slate-800 p-1 text-center font-bold">{totalSupervisor || ''}</td>
                </tr>
              </tbody>
            </table>

            {/* Assessment Grade Banner */}
            <div className="bg-[#EDEDED] border-x border-b border-slate-800 p-1.5 text-[10px] text-slate-800 leading-tight">
              <strong>Assessment Grade:</strong> A: 90-100 Outstanding; B: 80-89 Exceeds Expectation; C: 70-79 Meets Expectation; D: 60-69 Needs Improvement; E: &lt;60 Not Suitable for current role.
              {totalSupervisor > 0 && (
                <span className="ml-2 font-bold text-[#0B2341]">
                  [Result: Grade {gradeInfo.grade} - {gradeInfo.label}]
                </span>
              )}
            </div>
          </div>

          {/* Section C: Development */}
          <div className="mb-2">
            <div className="bg-[#D9E1F2] border border-slate-800 px-2 py-1 text-xs font-bold text-slate-900">
              C. Development.{' '}
              <span className="font-normal text-[11px]">To be completed by both employee and supervisor.</span>
            </div>
            <table className="w-full border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-800 p-1 w-1/2 text-left font-bold">
                    Comments to be entered by <span className="italic font-bold">employee:</span>
                  </th>
                  <th className="border border-slate-800 p-1 w-1/2 text-left font-bold">
                    Comments to be entered by <span className="italic font-bold">supervisor:</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-800 p-1.5 align-top h-16 text-[10.5px]">
                    <div className="font-semibold text-slate-600 mb-0.5">Desired developmental requests:</div>
                    <div>{evaluation.devRequestEmployee || ''}</div>
                  </td>
                  <td className="border border-slate-800 p-1.5 align-top h-16 text-[10.5px]">
                    <div className="font-semibold text-slate-600 mb-0.5">Desired developmental requests:</div>
                    <div>{evaluation.devRequestSupervisor || ''}</div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-800 p-1.5 align-top h-16 text-[10.5px]">
                    <div className="font-semibold text-slate-600 mb-0.5">Other comments:</div>
                    <div>{evaluation.otherCommentsEmployee || ''}</div>
                  </td>
                  <td className="border border-slate-800 p-1.5 align-top h-16 text-[10.5px]">
                    <div className="font-semibold text-slate-600 mb-0.5">Other comments:</div>
                    <div>{evaluation.otherCommentsSupervisor || ''}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer for Page 1 */}
        <div className="text-right text-[8.5px] text-slate-400 font-mono pt-1">
          Page 1 of 2 &bull; SCIS Staff Performance Evaluation &bull; Form SY{evaluation.schoolYear.code.replace('SY', '')}
        </div>
      </div>

      {/* ========================================================
          PAGE 2 OF 2
          ======================================================== */}
      <div className="flex flex-col justify-between pt-2" style={{ minHeight: '275mm' }}>
        <div>
          {/* Section D: Goals */}
          <div className="mb-3">
            <div className="bg-[#D9E1F2] border border-slate-800 px-2 py-1 text-xs font-bold text-slate-900">
              D. Goals.{' '}
              <span className="font-normal text-[11px]">Identify manageable goals that aid the successful delivery of responsibilities.</span>
            </div>
            <table className="w-full border border-slate-800 text-xs">
              <tbody>
                {[1, 2, 3].map((gIndex) => {
                  const goalObj = evaluation.goals.find((g) => g.goalIndex === gIndex);
                  return (
                    <tr key={gIndex} className="h-10">
                      <td className="border border-slate-800 p-1.5 align-top text-[10.5px]">
                        <span className="font-bold mr-2">{gIndex}.</span>
                        {goalObj?.description || ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section E: Mid Year Review Comments */}
          <div className="mb-3">
            <div className="bg-[#D9E1F2] border border-slate-800 px-2 py-1 text-xs font-bold text-slate-900">
              E. Mid Year Review Comments.
            </div>
            <table className="w-full border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-800 p-1 w-1/2 text-left font-bold">
                    Comments to be entered by <span className="italic">employee:</span>
                  </th>
                  <th className="border border-slate-800 p-1 w-1/2 text-left font-bold">
                    Comments to be entered by <span className="italic">supervisor:</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-800 p-2 align-top h-24 text-[10.5px] leading-relaxed">
                    {evaluation.midYearCommentsEmployee || ''}
                  </td>
                  <td className="border border-slate-800 p-2 align-top h-24 text-[10.5px] leading-relaxed">
                    {evaluation.midYearCommentsSupervisor || ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section F: End of Year Review Comments */}
          <div className="mb-3">
            <div className="bg-[#D9E1F2] border border-slate-800 px-2 py-1 text-xs font-bold text-slate-900">
              F. End of Year Review Comments.
            </div>
            <table className="w-full border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-800 p-1 w-1/2 text-left font-bold">
                    Comments to be entered by <span className="italic">employee:</span>
                  </th>
                  <th className="border border-slate-800 p-1 w-1/2 text-left font-bold">
                    Comments to be entered by <span className="italic">supervisor:</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-800 p-2 align-top h-24 text-[10.5px] leading-relaxed">
                    {evaluation.finalCommentsEmployee || ''}
                  </td>
                  <td className="border border-slate-800 p-2 align-top h-24 text-[10.5px] leading-relaxed">
                    {evaluation.finalCommentsSupervisor || ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Signatures Box */}
          <div className="mb-3">
            <table className="w-full border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className="border border-slate-800 p-1.5 w-1/4">Employee Signature</th>
                  <th className="border border-slate-800 p-1.5 w-1/12">Date</th>
                  <th className="border border-slate-800 p-1.5 w-1/4">Supervisor Signature</th>
                  <th className="border border-slate-800 p-1.5 w-1/12">Date</th>
                  <th className="border border-slate-800 p-1.5 w-1/4">Head of Department / Campus Lead Signature</th>
                  <th className="border border-slate-800 p-1.5 w-1/12">Date</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-12">
                  <td className="border border-slate-800 p-1 align-bottom text-center text-[10px] text-slate-400">
                    &nbsp;
                  </td>
                  <td className="border border-slate-800 p-1 align-bottom text-center text-[10px] text-slate-400">
                    &nbsp;
                  </td>
                  <td className="border border-slate-800 p-1 align-bottom text-center text-[10px] text-slate-400">
                    &nbsp;
                  </td>
                  <td className="border border-slate-800 p-1 align-bottom text-center text-[10px] text-slate-400">
                    &nbsp;
                  </td>
                  <td className="border border-slate-800 p-1 align-bottom text-center text-[10px] text-slate-400">
                    &nbsp;
                  </td>
                  <td className="border border-slate-800 p-1 align-bottom text-center text-[10px] text-slate-400">
                    &nbsp;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Criteria for Skills (Rubric Table) */}
          <div className="mb-2">
            <table className="w-full border border-slate-800 text-[9.5px]">
              <thead>
                <tr className="bg-[#1F4E79] text-white font-bold text-center">
                  <th className="border border-slate-800 p-1 w-24">Criteria for Skills</th>
                  <th className="border border-slate-800 p-1 w-32">5 (Excellent)</th>
                  <th className="border border-slate-800 p-1 w-32">4 (Very Good)</th>
                  <th className="border border-slate-800 p-1 w-32">3 (Good)</th>
                  <th className="border border-slate-800 p-1 w-32">2 (Fair)</th>
                  <th className="border border-slate-800 p-1 w-28">1 (Poor)</th>
                </tr>
              </thead>
              <tbody>
                {SKILL_RUBRICS.map((item) => (
                  <tr key={item.key}>
                    <td className="border border-slate-800 p-1 font-bold bg-slate-50 align-top">
                      {item.name}
                    </td>
                    <td className="border border-slate-800 p-1 align-top leading-tight">{item.rubrics[5]}</td>
                    <td className="border border-slate-800 p-1 align-top leading-tight">{item.rubrics[4]}</td>
                    <td className="border border-slate-800 p-1 align-top leading-tight">{item.rubrics[3]}</td>
                    <td className="border border-slate-800 p-1 align-top leading-tight">{item.rubrics[2]}</td>
                    <td className="border border-slate-800 p-1 align-top leading-tight">{item.rubrics[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fine Print Footer at Bottom */}
        <div className="pt-2 border-t border-slate-300 text-[8.5px] text-slate-500 flex items-center justify-between font-mono">
          <div>
            Official Document &bull; Shanghai Community International School &bull; Confidential
          </div>
          <div>
            Downloaded on: <span className="font-semibold text-slate-700">{downloadTime}</span> by{' '}
            <span className="font-semibold text-slate-700">{downloaderName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
