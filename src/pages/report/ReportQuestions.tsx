import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form,
  TextArea,
  Button,
  InlineLoading,
  InlineNotification,
  ProgressIndicator,
  ProgressStep,
  Breadcrumb,
  BreadcrumbItem,
  Grid,
  Column,
  Tile,
  Heading
} from '@carbon/react';
import { Save, ArrowRight } from '@carbon/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { saveReportQuestions, getReportQuestions } from '../../lib/services/reportQuestionsService';
import styles from '../../styles/pages/report/ReportQuestions.module.scss';

interface Question {
  id: string;
  section: string;
  text: string;
  order: number;
}

interface QuestionAnswer {
  questionId: string;
  answer: string;
}

// Hardcoded questions as specified
const questions: Question[] = [
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

const ReportQuestions: React.FC = () => {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const { user, currentOrgId } = useAuth();
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load existing answers or initialize with empty strings
  useEffect(() => {
    const loadAnswers = async () => {
      if (!reportId) return;
      
      try {
        setLoading(true);
        const existingQuestions = await getReportQuestions(reportId);
        
        if (existingQuestions.length > 0) {
          // Map existing answers to our format
          const existingAnswers = questions.map(q => {
            const existing = existingQuestions.find(eq => eq.question_id === q.id);
            return {
              questionId: q.id,
              answer: existing?.answer || ''
            };
          });
          setAnswers(existingAnswers);
        } else {
          // Initialize with empty answers
          const initialAnswers = questions.map(q => ({
            questionId: q.id,
            answer: ''
          }));
          setAnswers(initialAnswers);
        }
      } catch (error) {
        console.error('Error loading existing answers:', error);
        // Fallback to empty answers
        const initialAnswers = questions.map(q => ({
          questionId: q.id,
          answer: ''
        }));
        setAnswers(initialAnswers);
      } finally {
        setLoading(false);
      }
    };

    loadAnswers();
  }, [reportId]);

  // Group questions by section
  const questionsBySection = questions.reduce((acc, question) => {
    if (!acc[question.section]) {
      acc[question.section] = [];
    }
    acc[question.section].push(question);
    return acc;
  }, {} as Record<string, Question[]>);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => 
      prev.map(a => 
        a.questionId === questionId ? { ...a, answer } : a
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportId || !currentOrgId) {
      setError('Report ID or organization context not found');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Save answers to database
      await saveReportQuestions(reportId, answers);
      
      // Navigate to report editor
      navigate(`/report/${reportId}/edit`);
    } catch (err) {
      console.error('Error saving answers:', err);
      setError(err instanceof Error ? err.message : 'Failed to save answers');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate(`/report/${reportId}/edit`);
  };

  return (
    <AppLayout hideSidebar>
      <Breadcrumb>
        <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
        <BreadcrumbItem href="/reports">Reports</BreadcrumbItem>
        <BreadcrumbItem href={`/report/${reportId}`}>Report</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>Questions</BreadcrumbItem>
      </Breadcrumb>

      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>
          Report Questions
        </h1>
        <div className={styles.progressArea}>
          <ProgressIndicator currentIndex={1} spaceEqually>
            <ProgressStep label="Create Report" complete />
            <ProgressStep label="Questions" current />
            <ProgressStep label="Fill Report" secondaryLabel="Not Started" />
            <ProgressStep label="Preview Report" secondaryLabel="Not Started" />
          </ProgressIndicator>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.intro}>
          <Heading>Help us understand your project better</Heading>
          <p>
            Please answer the following questions to help us generate a more accurate and comprehensive report. 
            These answers will be used to populate various sections of your technical report.
          </p>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            hideCloseButton
            className={styles.notification}
          />
        )}

        {loading ? (
          <div className={styles.loadingContainer}>
            <InlineLoading description="Loading questions..." status="active" />
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
          {Object.entries(questionsBySection).map(([section, sectionQuestions]) => (
            <div key={section} className={styles.section}>
              <Tile className={styles.sectionHeader}>
                <Heading level={2}>{section}</Heading>
                <p>Please provide detailed answers to help populate this section of your report.</p>
              </Tile>
              
              <Grid className={styles.questionsGrid}>
                {sectionQuestions.map((question) => (
                  <Column key={question.id} lg={16} md={8} sm={4}>
                    <div className={styles.questionContainer}>
                      <label className={styles.questionLabel}>
                        {question.text}
                      </label>
                      <TextArea
                        id={question.id}
                        labelText=""
                        value={answers.find(a => a.questionId === question.id)?.answer || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="Enter your answer here..."
                        maxCount={1000}
                        rows={4}
                      />
                    </div>
                  </Column>
                ))}
              </Grid>
            </div>
          ))}

          <div className={styles.actions}>
            <Button
              kind="secondary"
              onClick={handleSkip}
              disabled={submitting}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              renderIcon={ArrowRight}
              disabled={submitting}
            >
              {submitting ? (
                <InlineLoading description="Saving..." status="active" />
              ) : (
                'Save & Continue to Editor'
              )}
            </Button>
          </div>
        </Form>
        )}
      </div>
    </AppLayout>
  );
};

export default ReportQuestions;
