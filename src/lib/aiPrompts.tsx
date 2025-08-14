import { ReactNode } from "react";
import { 
  Search, 
  Star, 
  Tools, 
  Analytics, 
  Rule,
  Edit,
  Checkmark,
  Warning,
  Money,
  Reset,
  Scale,
  Settings,
  Translate,
  CheckmarkFilled,
  Book,
  Calculator
} from '@carbon/icons-react';

export type OptionChild = {
  text: string;
  prompt: string;
  icon?: ReactNode;
  children?: never;
};

export type OptionParent = {
  text: string;
  children: OptionChild[];
  icon: ReactNode;
  prompt?: never;
};

export type OptionGroup = {
  text: string;
  options: (OptionChild | OptionParent)[];
};

// Mining-specific content generation options
const miningReportSections = [
  "Executive Summary",
  "Introduction and Terms of Reference", 
  "Reliance on Other Experts",
  "Property Description and Location",
  "Accessibility, Climate, Local Resources, Infrastructure and Physiography",
  "History",
  "Geological Setting and Mineralization",
  "Deposit Types",
  "Exploration",
  "Drilling",
  "Sample Preparation, Analyses and Security",
  "Data Verification",
  "Mineral Processing and Metallurgical Testing",
  "Mineral Resource Estimates",
  "Mineral Reserve Estimates",
  "Mining Methods",
  "Recovery Methods",
  "Project Infrastructure",
  "Market Studies and Contracts",
  "Environmental Studies, Permitting and Social or Community Impact",
  "Capital and Operating Costs",
  "Economic Analysis",
  "Adjacent Properties",
  "Other Relevant Data and Information",
  "Interpretation and Conclusions",
  "Recommendations",
  "References",
];

const technicalStyles = [
  "Professional Technical",
  "Executive Summary Style", 
  "Detailed Technical",
  "Regulatory Compliant",
  "Investor-Focused",
  "Peer Review Style",
];

const languages = [
  "English",
  "French", 
  "Spanish",
  "Portuguese",
  "Chinese",
  "German",
];

export const aiPromptGroups: OptionGroup[] = [
  {
    text: "Mining Report Enhancement",
    options: [
      {
        text: "🔍 Expand using Enhanced RAG",
        prompt: "EXPAND_USING_RAG", // Special identifier for RAG processing
        icon: <Search size={16} />,
      },
      {
        text: "Improve technical writing",
        prompt: "Improve the technical quality and clarity of this mining report content, ensuring it meets industry standards",
        icon: <Star size={16} />,
      },
      {
        text: "Add technical detail",
        prompt: "Expand this content with appropriate technical details for a mining report, including relevant technical terminology and industry-standard information",
        icon: <Tools size={16} />,
      },
      {
        text: "Add quantitative analysis",
        prompt: "Enhance this content by adding relevant quantitative analysis, data interpretation, and statistical information appropriate for mining reports",
        icon: <Analytics size={16} />,
      },
      {
        text: "Ensure regulatory compliance",
        prompt: "Review and enhance this content to ensure compliance with JORC Code or NI 43-101 standards as appropriate",
        icon: <Rule size={16} />,
      },
    ],
  },
  {
    text: "Content Generation",
    options: [
      {
        text: "Generate section content",
        children: miningReportSections.map((section) => ({
          text: section,
          prompt: `Generate professional content for the "${section}" section of a mining report, following industry best practices and regulatory standards`,
        })),
        icon: <Edit size={16} />,
      },
      {
        text: "Create methodology",
        prompt: "Create a detailed methodology section explaining the approach, procedures, and standards followed for this aspect of the mining project",
        icon: <Checkmark size={16} />,
      },
      {
        text: "Add risk assessment",
        prompt: "Generate a comprehensive risk assessment covering technical, environmental, economic, and operational risks relevant to this mining project aspect",
        icon: <Warning size={16} />,
      },
      {
        text: "Economic analysis",
        prompt: "Create economic analysis content including cost estimates, financial projections, and economic viability assessment for this mining project component",
        icon: <Money size={16} />,
      },
    ],
  },
  {
    text: "Content Modification", 
    options: [
      {
        text: "Simplify for executives",
        prompt: "Simplify this technical content for executive consumption while maintaining accuracy and key technical points",
        icon: <Reset size={16} />,
      },
      {
        text: "Adjust length",
        children: [
          {
            text: "Make more concise",
            prompt: "Condense this content while preserving all critical technical information and regulatory requirements",
          },
          {
            text: "Expand with detail", 
            prompt: "Expand this content with additional technical detail, supporting information, and comprehensive analysis",
          },
          {
            text: "Create executive summary",
            prompt: "Create a concise executive summary of this content highlighting key findings, conclusions, and recommendations",
          },
        ],
        icon: <Scale size={16} />,
      },
      {
        text: "Change technical style",
        children: technicalStyles.map((style) => ({
          text: style,
          prompt: `Rewrite this content in ${style} style, maintaining technical accuracy while adjusting tone and presentation`,
        })),
        icon: <Settings size={16} />,
      },
      {
        text: "Translate",
        children: languages.map((lang) => ({
          text: lang,
          prompt: `Translate this mining report content into ${lang}, maintaining technical terminology and regulatory compliance`,
        })),
        icon: <Translate size={16} />,
      },
    ],
  },
  {
    text: "Quality Assurance",
    options: [
      {
        text: "Review for accuracy",
        prompt: "Review this mining report content for technical accuracy, completeness, and adherence to industry standards",
        icon: <CheckmarkFilled size={16} />,
      },
      {
        text: "Check terminology",
        prompt: "Review and correct technical terminology, ensuring consistent use of mining industry standard terms and definitions",
        icon: <Book size={16} />,
      },
      {
        text: "Fact verification",
        prompt: "Verify the technical facts and statements in this content against industry standards and best practices",
        icon: <Search size={16} />,
      },
      {
        text: "Units and calculations",
        prompt: "Review and verify all units, measurements, and calculations in this content for accuracy and consistency",
        icon: <Calculator size={16} />,
      },
    ],
  },
];

// Helper function to get a specific prompt by text
export function getPromptByText(text: string): string | null {
  for (const group of aiPromptGroups) {
    for (const option of group.options) {
      if (option.text === text) {
        return option.prompt || null;
      }
      if ('children' in option && option.children) {
        for (const child of option.children) {
          if (child.text === text) {
            return child.prompt;
          }
        }
      }
    }
  }
  return null;
}

// Helper function to check if a prompt uses RAG
export function isRAGPrompt(prompt: string): boolean {
  return prompt === "EXPAND_USING_RAG";
} 