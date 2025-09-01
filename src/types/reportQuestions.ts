export interface ReportQuestion {
  id: string;
  report_id: string;
  question_id: string;
  question_text: string;
  question_section: string;
  question_order: number;
  answer: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionAnswer {
  questionId: string;
  answer: string;
}

export interface QuestionTemplate {
  id: string;
  section: string;
  text: string;
  order: number;
}

export interface SaveQuestionsRequest {
  reportId: string;
  answers: QuestionAnswer[];
}

