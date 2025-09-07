import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from "react";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Button, 
  Loading,
  InlineNotification,
  Grid,
  Column,
  Tag,
  Breadcrumb,
  BreadcrumbItem
} from '@carbon/react';
import { 
  Save,
  Close,
  View
} from '@carbon/icons-react';
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";
//import { BlockNoteEditor, defaultBlockSchema } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import {
  createAIExtension,
  AIMenuController,
  AIMenu,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { openai } from "@ai-sdk/openai";
import "@blocknote/xl-ai/style.css";
import { RoomProvider, useSelf, useOthers } from '../../lib/liveblocks.config';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import "@liveblocks/react-ui/styles.css";
import styles from '../../styles/pages/report/ReportEditor.module.scss';
import { formatDistanceToNow } from 'date-fns';
import {
  getReportWithContent,
  updateReportContent
} from '../../lib/services/reportEditService';
import { getReportTemplate } from '../../lib/reportTemplates';
import { getReportQuestions } from '../../lib/services/reportQuestionsService';
import { generateMockReportFromQuestions, shouldUseMockContent } from '../../lib/services/mockReportService';
import FloatingEditorMenu from "../../components/report/FloatingEditorMenu";
// User service functions are now configured in liveblocks.config.ts
import { supabase } from '../../lib/supabaseClient';
// Using token-based authentication via Supabase Edge Functions

// Using token-based authentication via Supabase Edge Functions

// Error boundary component for editor crashes
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

// Create a context for the editor, using a less strict type to avoid library type issues.
const EditorContext = createContext<any>(null);

// Create a provider component that initializes the editor.
// This component should be rendered within a Liveblocks RoomProvider.
const EditorProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  // Debug API key
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
  console.log('🤖 [REPORT EDITOR] API Key available:', !!apiKey);
  console.log('🤖 [REPORT EDITOR] API Key length:', apiKey?.length);
  console.log('🤖 [REPORT EDITOR] API Key starts with sk-:', apiKey?.startsWith('sk-'));
  
  // Create a collaborative BlockNote editor with AI extension
  const editor = useCreateBlockNoteWithLiveblocks(
    {
      // AI extension configuration
      dictionary: {
        ...en,
        ai: aiEn, // Add AI translations
      },
      extensions: [
        createAIExtension({
          model: openai('gpt-4o-mini', {
            apiKey: apiKey || 'sk-proj-missing',
          }),
        }),
      ],
    },
    {
      mentions: true,
      comments: true,
    }
  );

  return (
    <EditorContext.Provider value={editor}>
      {children}
    </EditorContext.Provider>
  );
});

// Custom hook to use the editor from context
const useEditor = () => {
  const editor = useContext(EditorContext);
  // The consuming component should handle the null state while the editor is initializing.
  return editor;
};

// Collaboration presence component showing active users
const CollaborationPresence: React.FC = React.memo(() => {
  const others = useOthers();
  const self = useSelf();
  //const userCount = others.length + 1; // Include current user

  // Get active user names
  const activeUsers = [
    ...(self?.presence?.user ? [self.presence.user.name] : []),
    ...others.map(other => other.presence?.user?.name || 'Anonymous').filter(Boolean)
  ];

  // Only log presence changes occasionally to avoid spam
  if (Math.random() < 0.1) { // 10% chance to log
    console.log(`👥 [PRESENCE] Active users:`, activeUsers);
  }

  // User resolution and mention functionality is now handled through Liveblocks token authentication

  return (
    <div className={styles.collaborationPresence}>
      <div className={styles.connectionStatus}>
        <div className={styles.onlineIndicator} />
        <span>Online</span>
      </div>
      <div className={styles.activeUsers}>
        {/* <span className={styles.userCount}>
          {userCount} {userCount === 1 ? 'user' : 'users'} active
        </span> */}
        {activeUsers.length > 0 && (
          <div className={styles.userList}>
            {activeUsers.slice(0, 3).map((userName, index) => (
              <span key={index} className={styles.userName}>
                {userName}
              </span>
            ))}
            {activeUsers.length > 3 && (
              <span className={styles.moreUsers}>
                +{activeUsers.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// Main report editor content component
const ReportEditorContent: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(new Date());
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  // Get current user for presence
  const self = useSelf();

  // Get the editor instance from the context
  const editor = useEditor();

  // Check if collaboration is ready
  const collaborationReady = !!(editor && self);

  // Custom suggestion menu with AI items
  const SuggestionMenuWithAI = React.useCallback(() => {
    if (!editor) return null;
    
    return (
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor),
              // Add the AI slash menu items
              ...getAISlashMenuItems(editor),
            ],
            query
          )
        }
      />
    );
  }, [editor]);

  // Auto-save setup refs
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const isSetupRef = useRef(false);


  // Data fetching
  useEffect(() => {
    if (!reportId) {
      setError('No report ID specified.');
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const reportData = await getReportWithContent(reportId);
        setReport(reportData);
        setLastSaved(new Date());
        
        // Note: Mention search functionality is available through the @ symbol in the editor
      } catch (err) {
        console.error(`Failed to load report ${reportId}:`, err);
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  // Content loading logic
  useEffect(() => {
    // Don't load content until we have the editor and the report data
    if (!editor || !report || isContentLoaded) {
      return;
    }

    try {
      // Check if there's already collaborative content to avoid overwriting
      const currentDocument = editor.document;
      const firstBlock = currentDocument[0];
      
      const isDefaultPlaceholder =
        currentDocument.length === 1 &&
        firstBlock.type === 'paragraph' &&
        (!firstBlock.content ||
          (Array.isArray(firstBlock.content) && firstBlock.content.length === 0) ||
          (Array.isArray(firstBlock.content) &&
            firstBlock.content.length === 1 &&
            firstBlock.content[0].type === 'text' &&
            firstBlock.content[0].text === 'Start writing your report here...'));

      const hasExistingContent = currentDocument.length > 0 && !isDefaultPlaceholder;

      if (hasExistingContent) {
        // If content exists, preserve it and mark content as loaded
        setIsContentLoaded(true);
        return;
      }

      // Check if user has answered questions and use mock content
      const loadContentWithQuestions = async () => {
        try {
          const questions = await getReportQuestions(reportId!);
          
          if (shouldUseMockContent(questions)) {
            console.log('📝 [CONTENT] Loading mock content based on answered questions');
            const mockContent = generateMockReportFromQuestions(questions);
            editor.replaceBlocks(editor.document, mockContent);
            
            // Auto-save the mock content to database
            try {
              await updateReportContent(reportId!, mockContent);
              console.log('📝 [CONTENT] Mock content auto-saved to database');
            } catch (error) {
              console.error('Error auto-saving mock content:', error);
            }
            
            return;
          }
        } catch (error) {
          console.error('Error loading questions for mock content:', error);
          // Continue with normal content loading if questions fail
        }

        // Load from database or a template if no collaborative content exists
        if (Array.isArray((report as any).report_content) && (report as any).report_content.length > 0) {
          const dbContent = (report as any).report_content;
          editor.replaceBlocks(editor.document, dbContent as any);
        } else {
          const template = getReportTemplate((report as any).template_type);
          const templateContent = template || [{
            type: "paragraph",
            content: "Start writing your report here..."
          }];
          editor.replaceBlocks(editor.document, templateContent as any);
        }
      };

      loadContentWithQuestions();
      setIsContentLoaded(true);
    } catch (error) {
      console.error('❌ [CONTENT] Error loading content:', error);
    }
  }, [editor, report, isContentLoaded, location.state]);

  // Auto-save functionality
  useEffect(() => {
    if (!report || !reportId || isSetupRef.current || !editor) return;
    
    isSetupRef.current = true;
    let lastSavedContent = '';
    
    // Initial content hash to avoid saving immediately after loading
    const getContentHash = (content: any) => {
      try {
        return JSON.stringify(content);
      } catch {
        return '';
      }
    };
    
    // Set initial content to avoid immediate save
    setTimeout(() => {
      try {
        lastSavedContent = getContentHash(editor.document);
        // Auto-save enabled
      } catch (error) {
        console.error('Error setting initial content:', error);
      }
    }, 2000); // Wait for content loading to complete
    
    autoSaveIntervalRef.current = setInterval(async () => {
      if (!isSavingRef.current && report && editor) {
        try {
          const currentContent = editor.document;
          const currentHash = getContentHash(currentContent);
          
          // Only save if content has actually changed
          if (currentHash !== lastSavedContent && lastSavedContent !== '') {
            isSavingRef.current = true;
            
            await updateReportContent(reportId, currentContent);
            lastSavedContent = currentHash;
            setLastSaved(new Date());
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          isSavingRef.current = false;
        }
      }
    }, 30000); // Auto-save every 30 seconds
    
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
      isSetupRef.current = false;
    };
  }, [report, reportId, editor]);

  // Manual save function
  const handleSave = useCallback(async () => {
    if (!editor || !reportId || isSavingRef.current) return;
    
    isSavingRef.current = true;
    setError(null);
    setSuccessMessage(null);
    
    try {
      const content = editor.document;
      await updateReportContent(reportId, content);
      setLastSaved(new Date());
      setSuccessMessage('Report saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Manual save failed:', error);
      setError('Failed to save report');
    } finally {
      isSavingRef.current = false;
    }
  }, [editor, reportId]);
    
  // Navigation handlers
  const handlePreview = useCallback(() => {
    navigate(`/report/preview/${reportId}`);
  }, [navigate, reportId]);

  const handleClose = useCallback(() => {
    navigate('/reports');
  }, [navigate]);

  // Memoized status tag
  const statusTag = useMemo(() => {
    switch (report?.status) {
      case 'draft':
        return <Tag type="purple">Draft</Tag>;
      case 'published':
        return <Tag type="green">Published</Tag>;
      case 'archived':
        return <Tag type="gray">Archived</Tag>;
      default:
        return <Tag type="gray">Draft</Tag>;
    }
  }, [report?.status]);

  // Memoized last saved display
  const lastSavedDisplay = useMemo(() => {
    if (!lastSaved) return 'never';
    return formatDistanceToNow(lastSaved, { addSuffix: true });
  }, [lastSaved]);

  if (loading) {
    return (
      <AppLayout hideSidebar>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Loading description="Loading report..." withOverlay={false} />
        </div>
      </AppLayout>
    );
  }

  if (error && !report) {
    return (
      <AppLayout hideSidebar>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <InlineNotification
              kind="error"
              title="Error Loading Report"
              subtitle={error}
              hideCloseButton
            />
          </Column>
        </Grid>
      </AppLayout>
    );
  }

  if (!editor) {
    return (
      <AppLayout hideSidebar>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Loading description="Initializing collaborative editor..." withOverlay={false} />

        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideSidebar>
      <div className={styles.topRowContainer}>
        <div className={styles.breadcrumbContainer}>
          <Breadcrumb>
            <BreadcrumbItem href="/reports">Reports</BreadcrumbItem>
            <BreadcrumbItem href={`/report/${reportId}/view`}>View Report</BreadcrumbItem>
            <BreadcrumbItem href={`/report/${reportId}/settings`}>Report Settings</BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>{report?.report_name || 'Edit Report'}</BreadcrumbItem>
          </Breadcrumb>
        </div>
        <div className={styles.headerActionsTop}> 
          <div className={styles.collaborationArea}>
            {self && (
              <CollaborationPresence />
            )}
            <div className={styles.lastSaved}>
              <p>Last saved {lastSavedDisplay}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.headerRow}>
        <div className={styles.pageTitle}>
          <h2 className={styles.pageTitle}>
            {report?.report_name || 'Edit Report'}
          </h2>
          {statusTag}
        </div>
        <div className={styles.headerActions}>
            <Button onClick={handleSave} disabled={!editor || isSavingRef.current} renderIcon={Save} kind="tertiary">
              {isSavingRef.current ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={handlePreview} disabled={!editor} renderIcon={View} kind="tertiary">
              Preview
            </Button>
            <Button onClick={handleClose} renderIcon={Close} kind="tertiary">
              Close
            </Button>
          </div>
      </div>

      {error && report && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          hideCloseButton
        />
      )}
      {successMessage && (
        <InlineNotification
          kind="success"
          title="Success"
          subtitle={successMessage}
          hideCloseButton
        />
      )}

      <div className={styles.editorAreaContainer}>
        <div key={`editor-container-${reportId}-${collaborationReady ? 'collab' : 'no-collab'}`} className={styles.editorWrapper}>
          <EditorErrorBoundary>
            <BlockNoteView 
              editor={editor}
              theme="light"
              slashMenu={false}
            >
              <SuggestionMenuWithAI />
              <AIMenuController 
                onGenerateClick={(prompt: string) => {
                  console.log('🤖 [AI] Generating content with prompt:', prompt);
                }}
              >
                <AIMenu />
              </AIMenuController>
            </BlockNoteView>
          </EditorErrorBoundary>
        </div>
        <FloatingEditorMenu editor={editor} />

      </div>
    </AppLayout>
  );
};

// Fetch user profile from database
const fetchUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Global flag to prevent linkify re-initialization warnings
let linkifyInitialized = false;

// Function to suppress linkify and TipTap warnings
const suppressEditorWarnings = () => {
  if (!linkifyInitialized) {
    // Override console.warn to filter out editor warnings
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('linkifyjs: already initialized') || 
          message.includes('Duplicate extension names found') ||
          message.includes('liveblocksMention')) {
        return; // Suppress these warnings
      }
      originalWarn.apply(console, args);
    };
    linkifyInitialized = true;
  }
};

// Main report editor component with Liveblocks providers
const ReportEditor: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string } | null>(null);
  const profileLoadedRef = useRef(false);

  // Suppress editor warnings early and clear token cache
  useEffect(() => {
    suppressEditorWarnings();
    
    // Clear Liveblocks token cache to ensure fresh authentication
    const clearTokenCache = async () => {
      try {
        const { clearLiveblocksTokenCache } = await import('../../lib/services/liveblocksTokenService');
        clearLiveblocksTokenCache();
        console.log('🔄 [AUTH] Cleared Liveblocks token cache');
      } catch (error) {
        console.log('⚠️ [AUTH] Could not clear token cache:', error);
      }
    };
    clearTokenCache();
  }, []);

  // Fetch user profile on component mount
  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id).then(profile => {
        setUserProfile(profile);
        profileLoadedRef.current = true;
      }).catch(error => {
        console.error('Failed to fetch user profile:', error);
        // Set a minimal profile to prevent infinite loading
        const fallbackProfile = { 
          full_name: user.email?.split('@')[0] || 'User', 
          email: user.email || '' 
        };
        setUserProfile(fallbackProfile);
        profileLoadedRef.current = true;
      });

      // Fallback timeout - don't wait forever
      const timeout = setTimeout(() => {
        if (!profileLoadedRef.current) {
          const fallbackProfile = { 
            full_name: user.email?.split('@')[0] || 'User', 
            email: user.email || '' 
          };
          setUserProfile(fallbackProfile);
          profileLoadedRef.current = true;
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [user?.id]);

  if (!reportId) {
    return (
      <AppLayout hideSidebar>
        <div style={{ padding: '20px' }}>
          <InlineNotification
            kind="error"
            title="Invalid Report"
            subtitle="No report ID specified."
            hideCloseButton
          />
        </div>
      </AppLayout>
    );
  }

  // Generate user information for Liveblocks
  const getUserInfo = () => {
    if (user) {
      // Use database profile data if available, otherwise fallback to auth metadata
      const fullName = userProfile?.full_name ||
                      user.user_metadata?.full_name || 
                      `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
                      user.email?.split('@')[0] ||
                      'User';
      
      // User info configured for collaboration
      
      return {
        id: user.id,
        name: fullName,
      };
    } else {
      // Fallback for anonymous users
      const anonymousId = `anonymous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        id: anonymousId,
        name: `Anonymous ${anonymousId.slice(-4)}`,
      };
    }
  };

  // Generate user color based on user ID for consistency (matches userService.ts)
  const generateUserColor = (userId: string) => {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
      "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
      "#F8C471", "#82E0AA", "#AED6F1", "#D7BDE2", "#F9E79F"
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Generate room ID that includes content awareness
  const generateRoomId = () => {
    // Use stable room ID for collaboration
    return `report-${reportId}`;
  };

  const userInfo = useMemo(() => {
    if (user) {
      const fullName =
        userProfile?.full_name ||
        user.user_metadata?.full_name ||
        `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
        user.email?.split('@')[0] ||
        'User';

      return {
        id: user.id,
        name: fullName,
      };
    } else {
      const anonymousId = `anonymous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        id: anonymousId,
        name: `Anonymous ${anonymousId.slice(-4)}`,
      };
    }
  }, [user, userProfile]);

  const userColor = useMemo(() => generateUserColor(userInfo.id), [userInfo.id]);
  const roomId = generateRoomId();

  const initialPresence = useMemo(() => {
    const presence = {
      cursor: null,
      selection: null,
      user: {
        id: userInfo.id,
        name: userInfo.name,
        color: userColor,
        avatar: "",
      },
    };
    console.log('👤 [PRESENCE] Setting initial presence:', presence.user);
    return presence;
  }, [userInfo, userColor]);

  // Don't render the room until we have the user profile loaded
  if (!userProfile && user) {
    return (
      <AppLayout hideSidebar>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Loading description="Loading user profile..." withOverlay={false} />
        </div>
      </AppLayout>
    );
  }

  // Setting up collaborative room with token authentication

  return (
    <RoomProvider 
      id={roomId}
      initialPresence={initialPresence}
    >
      <EditorProvider>
        <ClientSideSuspense fallback={
          <AppLayout hideSidebar>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Loading description="Loading collaborative features..." withOverlay={false} />
            </div>
          </AppLayout>
        }>
          <ReportEditorContent />
        </ClientSideSuspense>
      </EditorProvider>
    </RoomProvider>
  );
};

export default ReportEditor; 
