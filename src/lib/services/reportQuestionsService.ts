import { supabase } from '../supabaseClient';
import { ReportQuestion, QuestionAnswer, QuestionTemplate } from '../../types/reportQuestions';

// Question templates - these match the hardcoded questions in the component
const questionTemplates: QuestionTemplate[] = [
  // Executive Summary
  { id: 'exec-1', section: 'Executive Summary', text: 'What is the purpose of the technical report, and what specific estimates (e.g., Mineral Resources and Mineral Reserves) does it aim to support?', order: 1 },
  { id: 'exec-2', section: 'Executive Summary', text: 'How does the geological setting of the project influence the mineralization style, and what major geological features are associated with it?', order: 2 },
  { id: 'exec-3', section: 'Executive Summary', text: 'What methodologies were implemented for exploration, drilling, sampling, and resource estimation to ensure accuracy and compliance with industry standards?', order: 3 },
  { id: 'exec-4', section: 'Executive Summary', text: 'What are the key findings regarding economic viability based on the projected capital and operating costs, metal prices, and potential market dynamics?', order: 4 },
  { id: 'exec-5', section: 'Executive Summary', text: 'What recommendations are made for further exploration or studies to enhance the understanding of the project\'s resource potential and minimize associated risks?', order: 5 },
  
  // Introduction
  { id: 'intro-1', section: 'Introduction', text: 'What are the primary objectives and scope of the Technical Report, and which standards does it adhere to?', order: 6 },
  { id: 'intro-2', section: 'Introduction', text: 'Who are the Qualified Persons involved in the preparation of the Technical Report, and what specific sections or areas did each contribute to?', order: 7 },
  { id: 'intro-3', section: 'Introduction', text: 'What sources of information were utilized in the preparation of the Technical Report, and how was the data validated?', order: 8 },
  { id: 'intro-4', section: 'Introduction', text: 'What recent site visit details are available regarding the inspections conducted by the Qualified Persons, including the dates and focuses of those visits?', order: 9 },
  { id: 'intro-5', section: 'Introduction', text: 'What measurement units and currency formats are employed in the report, and how do they conform to standard practices in the industry?', order: 10 },
  
  // Reliance on Other Experts
  { id: 'reliance-1', section: 'Reliance on Other Experts', text: 'Who are the Qualified Persons (QPs) responsible for the preparation of the report, and what relevant expertise do they possess?', order: 11 },
  { id: 'reliance-2', section: 'Reliance on Other Experts', text: 'What is the source and basis of the information, conclusions, and opinions included in the report, and how was this information verified?', order: 12 },
  { id: 'reliance-3', section: 'Reliance on Other Experts', text: 'What legal opinions or title information were relied upon regarding the ownership and status of mineral claims, and what date were these documents prepared?', order: 13 },
  { id: 'reliance-4', section: 'Reliance on Other Experts', text: 'What specific recommendations or conclusions were made in the report regarding future due diligence and the status of mineral tenures?', order: 14 },
  { id: 'reliance-5', section: 'Reliance on Other Experts', text: 'What is the extent of reliance on expert opinions for various sections of the report, and how does it impact the findings presented?', order: 15 }
];

/**
 * Get question templates (the predefined questions)
 */
export const getQuestionTemplates = (): QuestionTemplate[] => {
  return questionTemplates;
};

/**
 * Get existing answers for a report
 */
export const getReportQuestions = async (reportId: string): Promise<ReportQuestion[]> => {
  try {
    const { data, error } = await supabase
      .from('report_questions')
      .select('*')
      .eq('report_id', reportId)
      .order('question_order');

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching report questions:', error);
    throw error;
  }
};

/**
 * Save answers for a report
 */
export const saveReportQuestions = async (reportId: string, answers: QuestionAnswer[]): Promise<void> => {
  try {
    // Prepare the data for insertion/update
    const questionsData = answers.map(answer => {
      const template = questionTemplates.find(q => q.id === answer.questionId);
      if (!template) {
        throw new Error(`Question template not found for ID: ${answer.questionId}`);
      }

      return {
        report_id: reportId,
        question_id: answer.questionId,
        question_text: template.text,
        question_section: template.section,
        question_order: template.order,
        answer: answer.answer.trim() || null
      };
    });

    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from('report_questions')
      .upsert(questionsData, {
        onConflict: 'report_id,question_id'
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error saving report questions:', error);
    throw error;
  }
};

/**
 * Delete all questions for a report (useful for cleanup)
 */
export const deleteReportQuestions = async (reportId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('report_questions')
      .delete()
      .eq('report_id', reportId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting report questions:', error);
    throw error;
  }
};

