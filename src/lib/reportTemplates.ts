import { PartialBlock } from "@blocknote/core";
import { standardReportSections } from './reportSections';

// Helper to generate blocks from sections
const createReportTemplate = (reportTitle: string, sections: string[]): PartialBlock[] => {
  const titleBlock: PartialBlock = { type: "heading", props: { level: 1 }, content: reportTitle };
  // Optional: Add a placeholder for TOC
  const tocPlaceholder: PartialBlock = { type: "heading", props: { level: 2 }, content: "Table of Contents" };
  const tocPara: PartialBlock = { type: "paragraph", content: "[Auto-generation or manual entry placeholder]" };

  const sectionBlocks: PartialBlock[] = sections.flatMap(section => ([
    { type: "heading", props: { level: 2 }, content: section },
    { type: "paragraph", content: "" } // Empty paragraph after each section heading
  ]));
  // Include title, TOC placeholder, and then the sections
  return [titleBlock, tocPlaceholder, tocPara, ...sectionBlocks];
};

// Main function to get template based on combined key
export const getReportTemplate = (templateKey: string): PartialBlock[] | undefined => {
  if (!templateKey) {
    console.warn('No template key provided for getReportTemplate');
    return createReportTemplate("New Custom Report", ["Introduction", "Body", "Conclusion"]);
  }
  
  let reportTitle = "Report"; // Default title
  const normalizedKey = templateKey.toLowerCase().replace('\u2013', '-').replace(/\s+/g, ''); // Normalize key: lowercase, replace en-dash, remove spaces
  
  console.log(`Normalized template key: ${normalizedKey}`); // Debug log

  // Ensure switch cases match the format used when creating reports
  switch (normalizedKey) {
    // JORC Cases
    case 'jorc-inferred': reportTitle = "JORC Mineral Resource Report - Inferred"; break;
    case 'jorc-indicated': reportTitle = "JORC Mineral Resource Report - Indicated"; break;
    case 'jorc-measured': reportTitle = "JORC Mineral Resource Report - Measured"; break;
    // NI 43-101 Cases
    // Ensure these match the exact values stored in the database/passed from CreateReport
    case 'ni43-101-inferred': reportTitle = "NI 43-101 Technical Report on Mineral Resources - Inferred"; break;
    case 'ni43-101-indicated': reportTitle = "NI 43-101 Technical Report on Mineral Resources - Indicated"; break;
    case 'ni43-101-measured': reportTitle = "NI 43-101 Technical Report on Mineral Resources - Measured"; break;
    default:
      console.warn(`Unknown or unhandled template key: ${templateKey} (Normalized: ${normalizedKey})`);
      // Return a generic template or undefined
      return createReportTemplate("New Custom Report", ["Introduction", "Body", "Conclusion"]);
  }

  // Generate and return the template using the helper and standard sections
  return createReportTemplate(reportTitle, standardReportSections);
}; 