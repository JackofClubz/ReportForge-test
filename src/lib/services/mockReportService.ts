import { ReportQuestion } from '../../types/reportQuestions';
import mockReportText from '../../data/mock-report-template.txt?raw';

/**
 * Convert text content to BlockNote blocks with proper markdown-style formatting
 */
const textToBlockNoteBlocks = (text: string): any[] => {
  const lines = text.split('\n');
  const blocks: any[] = [];
  let blockId = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines by creating paragraph spacers
    if (line.trim() === '') {
      blocks.push({
        id: `spacer-${blockId++}`,
        type: 'paragraph',
        props: { textAlignment: 'left', textColor: 'default' },
        content: [],
        children: []
      });
      continue;
    }

    // Main title (# heading)
    if (line.startsWith('# ')) {
      blocks.push({
        id: `title-${blockId++}`,
        type: 'heading',
        props: { level: 1, textAlignment: 'left', textColor: 'default' },
        content: [{ type: 'text', text: line.substring(2).trim(), styles: { bold: true } }],
        children: []
      });
      continue;
    }

    // Section headings (## heading)
    if (line.startsWith('## ')) {
      blocks.push({
        id: `section-${blockId++}`,
        type: 'heading',
        props: { level: 2, textAlignment: 'left', textColor: 'default' },
        content: [{ type: 'text', text: line.substring(3).trim(), styles: { bold: true } }],
        children: []
      });
      continue;
    }

    // Subsection headings (### heading)
    if (line.startsWith('### ')) {
      blocks.push({
        id: `subsection-${blockId++}`,
        type: 'heading',
        props: { level: 3, textAlignment: 'left', textColor: 'default' },
        content: [{ type: 'text', text: line.substring(4).trim(), styles: { bold: true } }],
        children: []
      });
      continue;
    }

    // Bold text (**bold**)
    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      blocks.push({
        id: `bold-${blockId++}`,
        type: 'paragraph',
        props: { textAlignment: 'left', textColor: 'default' },
        content: [{ type: 'text', text: line.substring(2, line.length - 2), styles: { bold: true } }],
        children: []
      });
      continue;
    }

    // List items (- item)
    if (line.startsWith('- ')) {
      blocks.push({
        id: `list-${blockId++}`,
        type: 'bulletListItem',
        props: { textAlignment: 'left', textColor: 'default' },
        content: [{ type: 'text', text: line.substring(2).trim() }],
        children: []
      });
      continue;
    }

    // Horizontal divider (---)
    if (line.trim() === '---') {
      blocks.push({
        id: `divider-${blockId++}`,
        type: 'paragraph',
        props: { textAlignment: 'center', textColor: 'default' },
        content: [{ type: 'text', text: '────────────────────────────────────────', styles: {} }],
        children: []
      });
      continue;
    }

    // Regular paragraphs
    if (line.trim()) {
      // Handle inline bold formatting within paragraphs
      const content = [];
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      
      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          content.push({ type: 'text', text: part.substring(2, part.length - 2), styles: { bold: true } });
        } else if (part.trim()) {
          content.push({ type: 'text', text: part, styles: {} });
        }
      }

      blocks.push({
        id: `paragraph-${blockId++}`,
        type: 'paragraph',
        props: { textAlignment: 'left', textColor: 'default' },
        content: content.length > 0 ? content : [{ type: 'text', text: line.trim() }],
        children: []
      });
    }
  }

  return blocks;
};

/**
 * Generate mock report content - shows your CAR Copper Project report when questions are answered
 */
export const generateMockReportFromQuestions = (questions: ReportQuestion[]): any[] => {
  const answeredQuestions = questions.filter(q => q.answer && q.answer.trim());
  
  if (answeredQuestions.length === 0) {
    // Return empty template if no questions answered
    return [
      {
        id: "welcome",
        type: "paragraph",
        props: { textAlignment: "left", textColor: "default" },
        content: [{ type: "text", text: "Start writing your report here..." }],
        children: []
      }
    ];
  }

  // If ANY questions were answered, show the complete CAR Copper Project report
  console.log(`📝 [MOCK REPORT] Loading CAR Copper Project report - ${answeredQuestions.length} questions were answered`);
  return textToBlockNoteBlocks(mockReportText);
};

/**
 * Check if user has answered questions to determine if mock content should be used
 * Returns true if ANY question has been answered (even just one)
 */
export const shouldUseMockContent = (questions: ReportQuestion[]): boolean => {
  const answeredQuestions = questions.filter(q => q.answer && q.answer.trim());
  const shouldUse = answeredQuestions.length > 0;
  console.log(`📝 [MOCK CHECK] Found ${answeredQuestions.length} answered questions - ${shouldUse ? 'WILL' : 'WILL NOT'} use mock content`);
  return shouldUse;
};
