export const standardReportSections = [
  // "Table of Contents", // Often auto-generated or handled differently. Included as heading for structure.
  "QP Certification", // Or Competent Person Consent/Statement for JORC
  "Summary",
  "Introduction",
  "Reliance on Other Experts",
  "Property Description and Location",
  "Accessibility, Climate, Local Resources, Infrastructure and Physiography", // Often combined or part of Property Description
  "History", // Often part of Property Description or Introduction
  "Geological Setting and Mineralization", // Often includes Deposit Types
  "Deposit Types",
  "Exploration",
  "Drilling",
  "Sample Preparation, Analyses and Security",
  "Data Verification", // Crucial section, often separate
  "Mineral Processing and Metallurgical Testing",
  "Mineral Resource Estimates",
  "Mineral Reserve Estimates", // May not apply to Inferred, but keep structure
  "Mining Methods", // May relate more to Reserve estimates
  "Recovery Methods", // May relate more to Reserve estimates
  "Project Infrastructure", // Often part of Property Description or Mining Methods
  "Market Studies and Contracts",
  "Environmental Studies, Permitting and Social or Community Impact",
  "Capital and Operating Costs",
  "Economic Analysis", // Often follows Costs, especially for PEA/PFS/FS level reports
  "Adjacent Properties",
  "Other Relevant Data and Information",
  "Interpretation and Conclusions",
  "Recommendations",
  "References",
  // "Date and Signature Page", // Usually handled outside the main content body
  // "Certificates of Qualified Persons" // Usually appended, not part of main flow
  // Consider adding Disclaimer if needed as a specific section heading
  "Disclaimer" // Added as requested
];

// Note: The list above combines common JORC/NI43-101 headings.
// You might refine this list or create separate lists per standard if needed.
// For now, using one comprehensive list for adaptability demonstration. 