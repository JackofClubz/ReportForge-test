import React from "react";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Button, 
  Loading,
  InlineNotification,
  Grid,
  Column,
  Tag,
  ProgressIndicator,
  ProgressStep,
  Breadcrumb,
  BreadcrumbItem
} from '@carbon/react';
import { 
  Save,
  Close,
  View
} from '@carbon/icons-react';
import AppLayout from '../../components/layout/AppLayout';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import styles from '../../styles/pages/report/ReportEditor.module.scss';
import { formatDistanceToNow } from 'date-fns';
import {
  getReportWithContent,
  updateReportContent
} from '../../lib/services/reportEditService';
import { getReportTemplate } from '../../lib/reportTemplates';
import { collaborationManager, CollaborationInstance } from '../../lib/services/collaborationService';
import FloatingEditorMenu from '../../components/report/FloatingEditorMenu';
import CollaborationPresence from '../../components/report/CollaborationPresence';

// Using the new collaboration service - removed old manager code

// Simple error boundary component with TypeScript types
interface EditorErrorBoundaryProps {
  children: React.ReactNode;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class EditorErrorBoundary extends React.Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EditorErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("BlockNote Editor error:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.errorContainer}>
          <InlineNotification
            kind="error"
            title="Editor Error"
            subtitle="There was a problem loading the editor. Please refresh the page."
            hideCloseButton
          />
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const ReportEditor: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Refs for collaboration - not in React state to avoid Strict Mode issues
  const collaborationRef = useRef<CollaborationInstance | null>(null);
  const currentUserRef = useRef<any>(null);
  const [collaborationReady, setCollaborationReady] = useState(false);

  // Log component mount
  useEffect(() => {
    console.log(`🚀 [COMPONENT] ReportEditor mounted with reportId:`, reportId);
    return () => {
      console.log(`🚀 [COMPONENT] ReportEditor unmounting for reportId:`, reportId);
    };
  }, [reportId]);

  // Set up collaboration - runs once per reportId, persists across Strict Mode re-mounts
  useEffect(() => {
    if (!reportId) {
      console.log('❌ [COLLAB] No reportId, collaboration disabled');
      return;
    }

    let mounted = true;

    const initializeCollaboration = async () => {
      try {
        console.log(`🤔 [COLLAB] Initializing collaboration for [${reportId}]`);
        const instance = await collaborationManager.getOrCreateInstance(reportId);
        
        if (mounted) {
          collaborationRef.current = instance;
          currentUserRef.current = instance.user;
          setCollaborationReady(true);
          console.log(`✅ [COLLAB] Collaboration initialized for [${reportId}]`);
        }
      } catch (error) {
        console.error(`❌ [COLLAB] Failed to initialize collaboration for [${reportId}]:`, error);
        if (mounted) {
          setCollaborationReady(false);
        }
      }
    };

    initializeCollaboration();

    return () => {
      mounted = false;
    };
  }, [reportId]);

  // Determine initial content for the editor
  const initialContent = useMemo(() => {
    // If collaboration is ready, let Yjs manage the content
    if (collaborationReady && collaborationRef.current?.config) {
      console.log(`📄 [INITIAL-CONTENT] Using Yjs-managed content for [${reportId}]`);
      return undefined; 
    }
    
    // If no collaboration yet, use report content or template
    if (!report) {
      console.log(`📄 [INITIAL-CONTENT] No report data yet for [${reportId}]`);
      return [{ type: "paragraph", content: "Loading..." }];
    }
    
    if (Array.isArray((report as any).report_content) && (report as any).report_content.length > 0) {
      console.log(`📄 [INITIAL-CONTENT] Using report content (${(report as any).report_content.length} blocks) for [${reportId}]`);
      return (report as any).report_content;
    }
    
    const template = getReportTemplate((report as any).template_type);
    const content = template || [{ type: "paragraph", content: "Start writing your report here..." }];
    console.log(`📄 [INITIAL-CONTENT] Using template content for [${reportId}]`);
    return content;
  }, [report, collaborationReady, reportId]);

  // Only create editor when collaboration and report are ready
  const shouldCreateEditor = collaborationReady && report && !loading;
  
  const editor = useCreateBlockNote(
    shouldCreateEditor ? {
      initialContent,
      collaboration: collaborationRef.current?.config,
    } : {
      initialContent: [{ type: "paragraph", content: "Loading..." }]
    }
  );

  // Log when editor is ready
  useEffect(() => {
    if (shouldCreateEditor && editor) {
      console.log(`✅ [EDITOR-READY] Editor created with collaboration config for [${reportId}]`);
    }
  }, [shouldCreateEditor, editor, reportId]);

  // Update debug objects with editor instance once available
  useEffect(() => {
    if (editor && collaborationRef.current) {
      (window as any).reportEditorDebug = {
        editor,
        collaboration: collaborationRef.current,
        reportId,
        forceEditorUpdate: () => {
          if (editor && typeof editor._tiptapEditor?.view?.updateState === 'function') {
            try {
              const currentState = editor._tiptapEditor.view.state;
              editor._tiptapEditor.view.updateState(currentState);
              console.log(`🔄 [DEBUG] Forced editor state update for [${reportId}]`);
            } catch (error) {
              console.warn(`⚠️ [DEBUG] Failed to force editor update for [${reportId}]:`, error);
            }
          } else {
            console.log(`❌ [DEBUG] Editor or updateState method not available for [${reportId}]`);
          }
        }
      };
    }
  }, [editor, collaborationReady, reportId]);

  // Load report content into Yjs document when collaboration is active
  useEffect(() => {
    if (!editor || !collaborationRef.current?.config || !report) {
      console.log(`📄 [CONTENT] Not ready - editor: ${!!editor}, collab: ${!!collaborationRef.current?.config}, report: ${!!report} for [${reportId}]`);
      return;
    }
    
    console.log(`📄 [CONTENT] Loading report content into Yjs document for [${reportId}]`);
    
    // Check if Yjs document is empty (to avoid overwriting collaborative changes)
    const fragment = collaborationRef.current.doc.getXmlFragment("document-store");
    const isEmpty = fragment.length === 0;
    
    console.log(`📄 [CONTENT] Y.js fragment state - length: ${fragment.length}, isEmpty: ${isEmpty} for [${reportId}]`);
    
    if (isEmpty) {
      console.log(`📄 [CONTENT] Yjs document is empty, loading content from database for [${reportId}]`);
      
      let contentToLoad: PartialBlock[] = [];
      
      if (Array.isArray((report as any).report_content) && (report as any).report_content.length > 0) {
        contentToLoad = (report as any).report_content;
        console.log(`📄 [CONTENT] Using existing report content (${contentToLoad.length} blocks) for [${reportId}]:`, contentToLoad);
      } else {
        const template = getReportTemplate((report as any).template_type);
        contentToLoad = template || [{ type: "paragraph", content: "Start writing your report here..." }];
        console.log(`📄 [CONTENT] Using template content for [${reportId}]:`, contentToLoad);
      }
      
      console.log(`📄 [CONTENT] Current editor blocks before replace:`, editor.topLevelBlocks.length);
      
      try {
        // Replace the editor blocks which will update the Yjs document
        editor.replaceBlocks(editor.topLevelBlocks, contentToLoad);
        console.log(`✅ [CONTENT] Successfully loaded content into Yjs document for [${reportId}]`);
        
        // Check fragment after replace
        setTimeout(() => {
          const newFragment = collaborationRef.current?.doc.getXmlFragment("document-store");
          console.log(`📄 [CONTENT] Y.js fragment after replace - length: ${newFragment?.length}, content: ${newFragment?.toString()?.substring(0, 200)}...`);
        }, 100);
        
      } catch (error) {
        console.error(`❌ [CONTENT] Failed to load content into Yjs document for [${reportId}]:`, error);
      }
    } else {
      console.log(`📄 [CONTENT] Yjs document already has content, skipping initial load for [${reportId}]`);
    }
  }, [editor, collaborationReady, report, reportId]);

  // Log editor creation and set up proper Yjs observation
  useEffect(() => {
    console.log(`📝 [EDITOR] Editor effect [${reportId}]. Editor:`, !!editor, "Collaboration:", !!collaborationRef.current);
    
    if (collaborationRef.current && collaborationRef.current.doc && editor) {
      const fragment = collaborationRef.current.doc.getXmlFragment("document-store");
      console.log(`🤝 [COLLAB] Active for [${reportId}]. Fragment initial:`, fragment.toString());
      
      const fragmentObserver = () => {
        console.log(`📝 [COLLAB] Fragment content changed for [${reportId}] - triggering editor update`);
        
        // Force the editor to recognize external changes
        if (editor && typeof editor._tiptapEditor?.view?.updateState === 'function') {
          try {
            // Trigger a state update to reflect Yjs changes
            const currentState = editor._tiptapEditor.view.state;
            editor._tiptapEditor.view.updateState(currentState);
            console.log(`🔄 [COLLAB] Forced editor state update for [${reportId}]`);
          } catch (error) {
            console.warn(`⚠️ [COLLAB] Failed to force editor update for [${reportId}]:`, error);
          }
        }
      };
      
      fragment.observeDeep(fragmentObserver);
      
      return () => {
        fragment.unobserveDeep(fragmentObserver);
        console.log(`🧹 [COLLAB] Removed fragment observer for [${reportId}]`);
      };
    } else {
      console.log(`❌ [COLLAB] No collaboration or editor for [${reportId}]`);
    }
  }, [editor, collaborationReady, reportId]);

  // Cleanup collaboration on unmount
  useEffect(() => {
    const currentReportId = reportId;
    
    return () => {
      console.log(`🧹 [CLEANUP] Component cleanup running for [${currentReportId}]`);
      if (currentReportId) {
        collaborationManager.releaseInstance(currentReportId);
      }
    };
  }, [reportId]);

  // Simple auto-save system - save every 60 seconds
  useEffect(() => {
    if (!editor || !reportId) return;

    console.log(`📊 [AUTOSAVE] Setting up simple auto-save for [${reportId}] (60s intervals)`);

    const autoSaveInterval = setInterval(async () => {
      console.log(`⏰ [AUTOSAVE] Auto-save triggered for [${reportId}]`);
      setError(null);
      setSuccessMessage(null);
      
      try {
        const contentToSave = editor.document;
        console.log(`💾 [AUTOSAVE] Saving content for [${reportId}], blocks:`, contentToSave.length);
        
        await updateReportContent(reportId, contentToSave);
        
        setLastSaved(new Date());
        setSuccessMessage('Report auto-saved');
        setTimeout(() => setSuccessMessage(null), 2000);
        console.log(`✅ [AUTOSAVE] Auto-save completed successfully for [${reportId}]`);
        
      } catch (err) {
        console.error(`❌ [AUTOSAVE] Auto-save failed for [${reportId}]:`, err);
        setError(err instanceof Error ? err.message : 'Failed to auto-save report.');
      }
    }, 60000); // Save every 60 seconds

    return () => {
      console.log(`🧹 [AUTOSAVE] Stopping auto-save interval for [${reportId}]`);
      clearInterval(autoSaveInterval);
    };
  }, [editor, reportId]);

  // Load report data
  useEffect(() => {
    if (!reportId) {
      setError('No report ID specified.');
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      console.log(`📊 [REPORT] Fetching report [${reportId}]`);
      setLoading(true);
      setError(null);
      
      try {
        const data = await getReportWithContent(reportId);
        console.log(`✅ [REPORT] Report loaded [${reportId}]:`, data.id);
        console.log(`🔍 [DEBUG] Report data structure:`, {
          id: data.id,
          report_name: data.report_name,
          template_type: data.template_type,
          status: data.status,
          all_properties: Object.keys(data),
          metadata: data.metadata,
          content_type: typeof (data as any).report_content,
          content_length: Array.isArray((data as any).report_content) ? (data as any).report_content.length : 'not array',
          content_preview: Array.isArray((data as any).report_content) ? (data as any).report_content.slice(0, 2) : (data as any).report_content
        });
        setReport(data);
        setLastSaved(data.updated_at ? new Date(data.updated_at) : new Date());
      } catch (err) {
        console.error(`❌ [REPORT] Failed to load report [${reportId}]:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  // Remove all replaceBlocks for initial load (content is set via initialContent)
  // Only keep placeholder/fallback logic for non-collab mode
  useEffect(() => {
    if (!editor) return;
    if (collaborationRef.current?.config) return; // Yjs manages content
    if (loading && !report) {
      const placeholderContent: PartialBlock[] = [
        { type: "paragraph", content: "Loading report data..." }
      ];
      if (JSON.stringify(editor.topLevelBlocks) !== JSON.stringify(placeholderContent)) {
        editor.replaceBlocks(editor.topLevelBlocks, placeholderContent);
      }
      return;
    }
    if (!report && !loading) {
      const fallbackContent: PartialBlock[] = [
        { type: "paragraph", content: "Could not load report content. Start typing or select a template." }
      ];
      if (JSON.stringify(editor.topLevelBlocks) !== JSON.stringify(fallbackContent)) {
        editor.replaceBlocks(editor.topLevelBlocks, fallbackContent);
      }
      return;
    }
  }, [editor, loading, report, collaborationReady]);

  const handlePreview = () => {
    navigate(`/report/preview/${reportId}`);
  };

  const handleClose = () => {
    navigate('/reports');
  };

  if (loading && !report && !error) { // Show initial loading screen only if no report and no error yet
    return (
      <AppLayout hideSidebar> {/* Changed to hideSidebar for consistency with error/editor views */}
        <div className={styles.loadingContainer}>
          <Loading description="Loading report..." withOverlay={false} />
        </div>
      </AppLayout>
    );
  }

  if (error && !report) { // If there was an error fetching the report itself
    return (
      <AppLayout hideSidebar>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <InlineNotification
              kind="error"
              title="Error Loading Report"
              subtitle={error || "Report not found or could not be loaded."}
              hideCloseButton // It's a full page error, no closing
            />
          </Column>
        </Grid>
      </AppLayout>
    );
  }
  
  // Wait for both collaboration and report to be ready before showing editor
  if (!collaborationReady || !report || loading) {
    return (
      <AppLayout hideSidebar>
        <div className={styles.loadingContainer}>
          <Loading 
            description={
              !collaborationReady ? "Initializing collaboration..." :
              loading ? "Loading report..." :
              !report ? "Loading report data..." :
              "Preparing editor..."
            } 
            withOverlay={false} 
          />
        </div>
      </AppLayout>
    );
  }

  // If editor is not ready yet after collaboration and report are loaded
  if (!editor) {
     return (
      <AppLayout hideSidebar>
        <div className={styles.loadingContainer}>
          <Loading description="Creating editor..." withOverlay={false} />
        </div>
      </AppLayout>
    );
  }

  const getStatusTag = () => {
    switch (report?.status) {
      case 'draft':
        return <Tag type="purple">In Progress</Tag>;
      case 'published':
        return <Tag type="green">Published</Tag>;
      default:
        return <Tag type="gray">Draft</Tag>; // Default or if report is null briefly
    }
  };

  return (
    <AppLayout hideSidebar>
      <div className={styles.topRowContainer}>
        <div className={styles.breadcrumbContainer}>
          <Breadcrumb noTrailingSlash>
            <BreadcrumbItem>
              <a href="/dashboard">Dashboard</a>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <a href="/reports">Reports</a>
            </BreadcrumbItem>
            {/* Ensure report and report.report_name are available before rendering these items */}
            {report && report.report_name && (
              <BreadcrumbItem>
                <a href={`/report/${reportId}/view`}>View: {report.report_name}</a>
              </BreadcrumbItem>
            )}
            {report && (
              <BreadcrumbItem>
                <a href={`/report/${reportId}/settings`}>Settings</a>
              </BreadcrumbItem>
            )}
            <BreadcrumbItem isCurrentPage>Edit</BreadcrumbItem>
          </Breadcrumb>
        </div>
        <div className={styles.headerActionsTop}> 
          <div className={styles.collaborationArea}>
            {currentUserRef.current && (
              <CollaborationPresence 
                reportId={reportId || ''}
                currentUserId={currentUserRef.current.id}
                isOnline={collaborationRef.current?.isOnline || false}
              />
            )}
            <div className={styles.lastSaved}>
              <p>Last saved {lastSaved ? formatDistanceToNow(lastSaved, { addSuffix: true }) : 'never'}</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <Button 
              kind="tertiary" 
              onClick={handlePreview} 
              renderIcon={View}
              hasIconOnly
              iconDescription="Preview report"
              disabled={!editor}
            />
            <Button 
              kind="tertiary" 
              onClick={handleClose} 
              renderIcon={Close}
              hasIconOnly
              iconDescription="Close editor"
            />
          </div>
        </div>
      </div>

      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>
          {report?.report_name || 'Edit Report'}
        </h2>
        {report && getStatusTag()}
        <div className={styles.progressArea}>
          <ProgressIndicator currentIndex={1} spaceEqually> {/* Assuming edit is step 1 (0-indexed) */}
            <ProgressStep label="Create Report" complete={report?.status !== 'draft'} />
            <ProgressStep label="Edit Report" current />
            <ProgressStep label="Preview Report" />
          </ProgressIndicator>
        </div>
      </div>

      {(error && report) && ( // Show error only if report context exists, otherwise covered by full page error
        <div className={styles.notificationContainer}>
          <div className={styles.notificationContent}>
            <InlineNotification
              kind="error"
              title="Editor Error"
              subtitle={error}
              onClose={() => setError(null)}
            />
          </div>
        </div>
      )}
      {successMessage && (
        <div className={styles.notificationContainer}>
          <div className={styles.notificationContent}>
            <InlineNotification
              kind="success"
              title="Success"
              subtitle={successMessage}
              onClose={() => setSuccessMessage(null)}
            />
          </div>
        </div>
      )}

      <div className={styles.editorAreaContainer}>
        <div key={`editor-container-${reportId}-${collaborationReady ? 'collab' : 'no-collab'}`} className={styles.editorWrapper}>
          <EditorErrorBoundary>
            <BlockNoteView 
              editor={editor}
              sideMenu={false}
              formattingToolbar={false}
            />
          </EditorErrorBoundary>
        </div>
        <FloatingEditorMenu editor={editor} />
      </div>
    </AppLayout>
  );
};

export default ReportEditor;