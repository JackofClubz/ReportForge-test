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
        prompt: "Transform this technical mining content for executive consumption by: 1) Replacing complex technical jargon with clear, business-friendly language, 2) Explaining any technical terms that must be retained in parentheses or brief definitions, 3) Focusing on business implications, risks, and opportunities, 4) Using analogies or comparisons when helpful, 5) Maintaining technical accuracy while making it accessible to non-technical stakeholders. Ensure executives can understand the key points without specialized mining knowledge.",
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
            prompt: "Create a concise executive summary of this content for senior leadership by: 1) Highlighting key findings, conclusions, and recommendations in business terms, 2) Explaining technical concepts in accessible language with brief definitions, 3) Emphasizing financial implications, risks, and strategic opportunities, 4) Using clear, non-technical language while maintaining accuracy, 5) Structuring information for quick executive decision-making. Focus on what executives need to know to make informed business decisions.",
          },
        ],
        icon: <Scale size={16} />,
      },
      {
        text: "Change technical style",
        children: technicalStyles.map((style) => {
          let enhancedPrompt = `Rewrite this content in ${style} style, maintaining technical accuracy while adjusting tone and presentation`;
          
          // Add specific instructions for executive-focused styles
          if (style === "Executive Summary Style") {
            enhancedPrompt = `Rewrite this content in ${style} style by: 1) Using clear, business-focused language accessible to non-technical executives, 2) Explaining technical terms in parentheses or brief definitions, 3) Emphasizing business implications, risks, and opportunities, 4) Structuring information for quick decision-making, 5) Maintaining technical accuracy while prioritizing clarity and accessibility`;
          } else if (style === "Investor-Focused") {
            enhancedPrompt = `Rewrite this content in ${style} style by: 1) Translating technical findings into investment implications, 2) Explaining complex mining concepts in financial and business terms, 3) Defining technical jargon when necessary for understanding, 4) Focusing on value drivers, risks, and market opportunities, 5) Using language that financial stakeholders can easily understand`;
          }
          
          return {
            text: style,
            prompt: enhancedPrompt,
          };
        }),
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