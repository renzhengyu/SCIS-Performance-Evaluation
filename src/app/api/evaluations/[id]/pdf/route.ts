import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, logAudit } from '@/lib/db';
import puppeteer from 'puppeteer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: {
        schoolYear: true,
        staffProfile: true,
        supervisor: true,
        deptHead: true,
      },
    });

    if (!evaluation) {
      return new NextResponse('Evaluation not found', { status: 404 });
    }

    const downloaderEmail = session?.user?.email || 'Anonymous/Export';
    const downloaderName = (session?.user as any)?.fullName || session?.user?.name || downloaderEmail;

    // Log the audit event for downloading the PDF
    await logAudit({
      userId: (session?.user as any)?.id,
      userEmail: downloaderEmail,
      userName: downloaderName,
      action: 'PDF_DOWNLOADED',
      entityType: 'Evaluation',
      entityId: id,
      diffData: {
        staffName: evaluation.staffNameSnapshot,
        schoolYear: evaluation.schoolYear.code,
      },
    });

    // Form timestamp in CST / UTC
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-US', {
      timeZone: 'Asia/Shanghai',
      dateStyle: 'medium',
      timeStyle: 'medium',
    }) + ' CST';

    // Puppeteer navigates internally to the local Next.js server on 127.0.0.1
    // This avoids egress loopback timeouts and firewall hairpinning issues inside Docker.
    const port = process.env.PORT || '3000';
    const printUrl = `http://127.0.0.1:${port}/evaluations/${id}/print?timestamp=${encodeURIComponent(
      formattedTimestamp
    )}&downloader=${encodeURIComponent(downloaderName)}`;

    // Launch Puppeteer to generate pixel-perfect A4 PDF
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=medium',
      ],
    });

    let pdfBuffer: Uint8Array;
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
      await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.evaluateHandle('document.fonts.ready');

      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '8mm',
          bottom: '8mm',
          left: '10mm',
          right: '10mm',
        },
        preferCSSPageSize: true,
      });
    } finally {
      await browser.close();
    }

    const sanitizedStaffName = evaluation.staffNameSnapshot.replace(/\s+/g, '_');
    const filename = `SCIS_Evaluation_${sanitizedStaffName}_${evaluation.schoolYear.code}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return new NextResponse(`Failed to generate PDF: ${error?.message || error}`, { status: 500 });
  }
}
