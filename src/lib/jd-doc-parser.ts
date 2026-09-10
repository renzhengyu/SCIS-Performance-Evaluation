import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';

export interface ParsedJobDescription {
  title: string;
  reportsTo: string;
  reportsToJdId: string | null;
  positionSummary: string;
  responsibilities: string[];
  skillsAttributes: string[];
  qualifications: string[];
  rawTextPreview: string;
}

/**
 * Clean bullet prefixes like •, -, *, 1., a., etc.
 */
function cleanBullet(text: string): string {
  return text
    .replace(/^[\s\u2022\u2023\u25E6\u2043\u2219\*\-\–\—\•\d+\.\)]+\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cleans HTML tags into structured line breaks
 */
function htmlToStructuredText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<td[^>]*>/gi, ' ')
    .replace(/<th[^>]*>/gi, ' ')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/**
 * Extracts raw text from either .docx (via mammoth) or .doc (via word-extractor)
 */
export async function extractTextFromWordBuffer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const isDocx =
    filename.toLowerCase().endsWith('.docx') ||
    (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b); // PK zip header

  if (isDocx) {
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer });
      if (htmlResult.value && htmlResult.value.trim().length > 0) {
        return htmlToStructuredText(htmlResult.value);
      }
      const rawResult = await mammoth.extractRawText({ buffer });
      if (rawResult.value && rawResult.value.trim().length > 0) {
        return rawResult.value;
      }
    } catch {
      // If mammoth fails on an ambiguous file, fallback to word-extractor
    }
  }

  // Fallback or binary .doc
  try {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    const body = doc.getBody();
    if (body && body.trim().length > 0) {
      return body;
    }
  } catch (err: any) {
    throw new Error(`Failed to extract text from document: ${err.message || 'Unknown error'}`);
  }

  throw new Error('The uploaded document appears to be empty or unreadable.');
}

/**
 * Intelligent section matcher for Job Descriptions
 */
export function parseJobDescriptionText(
  rawText: string,
  existingJds: { id: string; title: string }[] = []
): ParsedJobDescription {
  // Normalize carriage returns
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = '';
  let reportsTo = '';
  let reportsToJdId: string | null = null;
  let positionSummary = '';
  const responsibilities: string[] = [];
  const skillsAttributes: string[] = [];
  const qualifications: string[] = [];

  type Section = 'NONE' | 'SUMMARY' | 'RESPONSIBILITIES' | 'SKILLS' | 'QUALIFICATIONS' | 'FOOTER';
  let currentSection: Section = 'NONE';
  const summaryParagraphs: string[] = [];

  // Patterns for section headings
  const patterns = {
    titlePrefix: /^(?:position|job|role)\s*title\s*[:：]\s*(.+)$/i,
    reportsToPrefix: /^(?:reports\s*to|supervised\s*by|reports\s*directly\s*to|line\s*manager)\s*[:：]\s*(.+)$/i,
    summaryHeading: /^(?:position\s+summary|job\s+summary|role\s+summary|purpose\s+of\s+position|general\s+summary|position\s+purpose|role\s+overview|overview|job\s+description\s+summary)\b/i,
    responsibilitiesHeading: /^(?:major\s+responsibilities(?:\s+and\s+duties)?|key\s+responsibilities|duties\s+and\s+responsibilities|essential\s+duties|primary\s+responsibilities|responsibilities\s+and\s+duties|responsibilities|duties)\b/i,
    skillsHeading: /^(?:skills\s+(?:and|&)\s+attributes|required\s+skills|personal\s+attributes|key\s+competencies|competencies|knowledge[,\s]+skills\s+(?:and|&)\s+abilities|skills)\b/i,
    qualificationsHeading: /^(?:qualifications(?:\s+(?:and|&)\s+experience)?|minimum\s+qualifications|education\s+and\s+experience|requirements|credentials)\b/i,
    footerHeading: /^(?:safeguarding|child\s+protection|equal\s+opportunity|terms\s+of\s+employment)\b/i,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for inline Title pattern (e.g. "Position Title: Apple Hardware Specialist")
    const titleMatch = line.match(patterns.titlePrefix);
    if (titleMatch && !title) {
      title = titleMatch[1].trim();
      continue;
    }

    // Check for inline Reports To pattern (e.g. "Reports To: Director of Technology")
    const reportsMatch = line.match(patterns.reportsToPrefix);
    if (reportsMatch && !reportsTo) {
      reportsTo = reportsMatch[1].trim();
      continue;
    }

    // Check section transitions
    if (patterns.summaryHeading.test(line)) {
      currentSection = 'SUMMARY';
      // If line contains colon with content on same line
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1 && colonIdx < line.length - 1) {
        const after = line.slice(colonIdx + 1).trim();
        if (after) summaryParagraphs.push(after);
      }
      continue;
    }

    if (patterns.responsibilitiesHeading.test(line)) {
      currentSection = 'RESPONSIBILITIES';
      continue;
    }

    if (patterns.skillsHeading.test(line)) {
      currentSection = 'SKILLS';
      continue;
    }

    if (patterns.qualificationsHeading.test(line)) {
      currentSection = 'QUALIFICATIONS';
      continue;
    }

    if (patterns.footerHeading.test(line)) {
      currentSection = 'FOOTER';
      continue;
    }

    // Process line based on current section
    if (currentSection === 'NONE') {
      // If title not found yet and this is an early line that looks like a title
      if (!title && i < 4) {
        // Skip generic header lines
        if (
          !line.toLowerCase().includes('job description') &&
          !line.toLowerCase().includes('community international school') &&
          !line.toLowerCase().includes('scis') &&
          line.length > 3 &&
          line.length < 80
        ) {
          title = line;
          continue;
        }
      }
    } else if (currentSection === 'SUMMARY') {
      summaryParagraphs.push(line);
    } else if (currentSection === 'RESPONSIBILITIES') {
      const cleaned = cleanBullet(line);
      if (cleaned.length > 5) {
        responsibilities.push(cleaned);
      }
    } else if (currentSection === 'SKILLS') {
      const cleaned = cleanBullet(line);
      if (cleaned.length > 3) {
        skillsAttributes.push(cleaned);
      }
    } else if (currentSection === 'QUALIFICATIONS') {
      const cleaned = cleanBullet(line);
      if (cleaned.length > 3) {
        qualifications.push(cleaned);
      }
    }
  }

  // Join summary paragraphs
  positionSummary = summaryParagraphs.join('\n\n').trim();

  // If reportsTo is found, attempt to match against existing JDs
  if (reportsTo && existingJds.length > 0) {
    const cleanTarget = reportsTo.toLowerCase().trim();
    // 1. Exact match
    const exactMatch = existingJds.find((j) => j.title.toLowerCase().trim() === cleanTarget);
    if (exactMatch) {
      reportsToJdId = exactMatch.id;
    } else {
      // 2. Substring match
      const subMatch = existingJds.find(
        (j) =>
          cleanTarget.includes(j.title.toLowerCase().trim()) ||
          j.title.toLowerCase().trim().includes(cleanTarget)
      );
      if (subMatch) {
        reportsToJdId = subMatch.id;
      }
    }
  }

  // Fallback defaults if sections were empty
  return {
    title: title || '',
    reportsTo: reportsTo || '',
    reportsToJdId,
    positionSummary: positionSummary || '',
    responsibilities: responsibilities.length > 0 ? responsibilities : [''],
    skillsAttributes: skillsAttributes.length > 0 ? skillsAttributes : [''],
    qualifications: qualifications.length > 0 ? qualifications : [''],
    rawTextPreview: rawText.slice(0, 1500),
  };
}
