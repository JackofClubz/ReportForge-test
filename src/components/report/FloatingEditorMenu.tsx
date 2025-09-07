import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button, TextArea, Loading } from '@carbon/react';
import {
  Menu,         // For Outline/Menu
  AddComment,   // For Comments
  AiGenerate,   // For AI Assist
  RuleLocked,   // For Permissions
  TrashCan,     // For Delete Comments
  Send,         // For Submit Comments
  Copy,         // For Copy AI Response
  Reset,        // For Regenerate
  ChevronLeft,  // For Back Navigation
} from '@carbon/icons-react';
import { BlockNoteEditor } from '@blocknote/core';
import { 
  useThreads, 
  useCreateThread, 
  useCreateComment,
  useDeleteComment,
} from '../../lib/liveblocks.config';
import { 
  Composer, 
  Thread,
  Comment 
} from '@liveblocks/react-ui';
import { aiPromptGroups, getPromptByText, isRAGPrompt, type OptionGroup } from '../../lib/aiPrompts';
import { supabase } from '../../lib/supabaseClient';
import styles from '../../styles/pages/report/ReportEditor.module.scss';

interface Section {
  id: string;
  title: string;
  level: number;
  blockId: string;
}

interface FloatingEditorMenuProps {
  editor: BlockNoteEditor | null;
}

// AI state management
type AIState = "initial" | "loading" | "complete" | "error";

interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Global submission lock to prevent duplicate submissions
let isGloballySubmitting = false;
let lastSubmissionContent = '';
let lastSubmissionTime = 0;

const FloatingEditorMenu: React.FC<FloatingEditorMenuProps> = ({ editor }) => {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const [showWayfinder, setShowWayfinder] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // AI-specific state
  const [aiState, setAiState] = useState<AIState>("initial");
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [selectedText, setSelectedText] = useState<string>("");
  const [currentPromptPage, setCurrentPromptPage] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // Refs for managing focus and cleanup
  const wayfinderRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  // Liveblocks hooks
  const { threads } = useThreads();
  const createThread = useCreateThread();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  // Mount effect
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Get the last AI message
  const lastAiMessage = useMemo(() => {
    const lastMessage = aiMessages.filter((m) => m.role === "assistant").slice(-1)[0];
    return lastMessage || null;
  }, [aiMessages]);

  // Get current prompt page for navigation
  const currentPage = currentPromptPage[currentPromptPage.length - 1];
  const selectedOption = useMemo(() => {
    return aiPromptGroups
      .flatMap((group) => group.options)
      .flatMap((option) =>
        'children' in option && option.children ? [option, ...option.children] : [option]
      )
      .find((option) => option.text === currentPage);
  }, [currentPage]);

  // Get selected text when AI panel opens
  useEffect(() => {
    if (showAI && editor) {
      const selection = editor.getSelectedText();
      setSelectedText(selection || "");
    }
  }, [showAI, editor]);

  // Position menu to stay sticky and visible during scroll
  useEffect(() => {
    if (!editor || !mounted) return;

    const updateMenuPosition = () => {
      try {
        const editorElement = document.querySelector('.bn-editor') || document.querySelector('[data-id]');
        if (!editorElement) {
          // Keep menu visible even if editor element not found initially
          setIsVisible(true);
          setMenuTop(100); // Default position
          return;
        }

        const rect = editorElement.getBoundingClientRect();
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        
        // Calculate a sticky position that follows the scroll
        // Start from a base position and adjust based on scroll
        const baseTop = 100; // Base position from top of viewport
        const editorTop = rect.top;
        
        let newTop;
        if (editorTop > baseTop) {
          // Editor is below our base position, stick to base
          newTop = baseTop;
        } else if (rect.bottom > baseTop + 100) {
          // Editor spans across our position, keep at base
          newTop = baseTop;
        } else {
          // Editor is above, follow it up but with minimum distance from top
          newTop = Math.max(20, rect.bottom - 50);
        }
        
        // Ensure menu doesn't go too far down the viewport
        newTop = Math.min(newTop, viewportHeight - 300);
        
        setMenuTop(newTop);
        // Keep menu always visible unless editor is completely out of view
        setIsVisible(rect.bottom > -200 && rect.top < viewportHeight + 200);
      } catch (error) {
        console.error('Error updating menu position:', error);
        // On error, keep menu visible at default position
        setIsVisible(true);
        setMenuTop(100);
      }
    };

    const debouncedUpdate = debounce(updateMenuPosition, 50); // Faster updates for smoother following
    
    updateMenuPosition();
    window.addEventListener('scroll', debouncedUpdate);
    window.addEventListener('resize', debouncedUpdate);

    return () => {
      window.removeEventListener('scroll', debouncedUpdate);
      window.removeEventListener('resize', debouncedUpdate);
    };
  }, [editor, mounted]);

     // Extract sections from editor content
   const extractSections = useCallback(() => {
     if (!editor || !mounted) return;

     try {
       const blocks = editor.topLevelBlocks;
       const newSections: Section[] = [];

       blocks.forEach((block) => {
         if (block.type === 'heading') {
           // Try to extract text content from various block content formats
           let title = '';
           try {
             const content = (block as any).content;
             if (typeof content === 'string') {
               title = content;
             } else if (Array.isArray(content)) {
               title = content.map(item => {
                 if (typeof item === 'string') return item;
                 if (item && typeof item === 'object' && 'text' in item) {
                   return String(item.text || '');
                 }
                 return '';
               }).join('');
             } else if (content) {
               title = String(content);
             }
           } catch (err) {
             console.warn('Error extracting block content:', err);
             title = 'Untitled Section';
           }

           if (title.trim()) {
             newSections.push({
               id: `section-${block.id}`,
               title: title.trim(),
               level: (block.props as any)?.level || 1,
               blockId: block.id
             });
           }
         }
       });

       setSections(newSections);
     } catch (error) {
       console.error('Error extracting sections:', error);
       setSections([]);
     }
   }, [editor, mounted]);

  // Listen for content changes
  useEffect(() => {
    if (!editor || !mounted) return;

    extractSections();

    const unsubscribe = editor.onChange(() => {
      if (mounted) {
        extractSections();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [editor, mounted, extractSections]);

  // AI Functions
  const submitAIPrompt = useCallback(async (prompt: string) => {
    if (!selectedText.trim() && !customPrompt.trim()) {
      console.warn('No text selected and no custom prompt provided');
      return;
    }

    setAiState("loading");
    setCustomPrompt("");

    const queryText = selectedText || customPrompt;
    const systemMessage = `You are a professional mining report assistant. The user has selected this text: "${queryText}"`;

    try {
      // Check if this is a RAG prompt
      if (isRAGPrompt(prompt)) {
        console.log('🔍 [AI] Using enhanced RAG expansion...');
        
        // Extract user inputs from selected text for personalization
        const extractUserInputs = (text: string): Record<string, string[]> => {
          const userInputs: Record<string, string[]> = {};

          // Extract qualified person names
          const qpMatches = text.match(/(?:qualified persons?|qps?)[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi);
          if (qpMatches) {
            userInputs["Qualified Person"] = qpMatches.map(name => 
              name.replace(/qualified persons?:?\s*/i, "").trim()
            );
          }

          // Extract company names 
          const companyMatches = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Corporation|Corp|Inc|Limited|Ltd|Company|Co))/gi);
          if (companyMatches) {
            userInputs["Company"] = companyMatches;
          }

          // Extract locations
          const locationMatches = text.match(/(?:located|situated|in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z][a-z]+)/gi);
          if (locationMatches) {
            userInputs["Location"] = locationMatches.map(loc => 
              loc.replace(/(?:located|situated|in|at)\s+/i, "").trim()
            );
          }

          return userInputs;
        };

        // Section detection function (from ai-editor 2)
        const detectSection = (text: string): string | undefined => {
          const lower = text.toLowerCase();
          
          if (lower.includes("qualified person")) return "Qualified Person";
          if (lower.includes("sampling")) return "Sampling Techniques";
          if (lower.includes("site visit")) return "Site Visits";
          if (lower.includes("data verification")) return "Data Verification";
          if (lower.includes("mineral resources")) return "Mineral Resource Estimates";
          if (lower.includes("executive summary")) return "Executive Summary";
          if (lower.includes("introduction")) return "Introduction";
          if (lower.includes("property description")) return "Property Description";
          if (lower.includes("geology")) return "Geological Setting";
          if (lower.includes("exploration")) return "Exploration";
          if (lower.includes("drilling")) return "Drilling";
          if (lower.includes("environmental")) return "Environmental Studies";
          if (lower.includes("economic")) return "Economic Analysis";
          
          return undefined;
        };

        const userInputs = extractUserInputs(queryText);
        const section = detectSection(queryText);
        
        console.log('👤 [AI] Extracted user inputs:', userInputs);
        console.log('📑 [AI] Detected section:', section);

        try {
          // Call local RAG API (like ai-editor projects)
          const response = await fetch('/api/rag-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: queryText,
              section,
              userInputs,
              topK: 7
            }),
          });

          if (!response.ok) {
            throw new Error(`RAG API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();

          if (data.error || data.fallback) {
            throw new Error(data.error || 'RAG service not available');
          }

          // Enhanced response with section detection and personalization info
          let enhancedResponse = data.answer;
          
          if (data.section) {
            enhancedResponse = `**Section: ${data.section}**\n\n${enhancedResponse}`;
          }

          if (data.userInputs && Object.keys(data.userInputs).length > 0) {
            const inputsSummary = Object.entries(data.userInputs)
              .map(([key, values]) => `${key}: ${Array.isArray(values) ? values.join(', ') : values}`)
              .join('\n');
            enhancedResponse += `\n\n---\n**Personalized for:**\n${inputsSummary}`;
          }

          if (data.sources && data.sources.length > 0) {
            const sourcesSummary = data.sources
              .map((source: any, index: number) => `${index + 1}. ${source.section || 'Unknown Section'} (Score: ${(source.score * 100).toFixed(1)}%)`)
              .join('\n');
            enhancedResponse += `\n\n---\n**Sources:**\n${sourcesSummary}`;
          }

          setAiMessages([
            ...aiMessages,
            { role: "system", content: systemMessage },
            { role: "user", content: "Expand using Enhanced RAG" },
            { role: "assistant", content: enhancedResponse },
          ]);
          setAiState("complete");

        } catch (error) {
          console.error('❌ [AI] RAG Error:', error);
          console.log('🔄 [AI] Falling back to standard AI prompt...');
          
          // Fallback to standard AI prompt when RAG fails
          try {
            const fallbackPrompt = `You are a professional mining report assistant. The user is working on the "${section || 'unknown'}" section and has selected this text: "${queryText}". Please provide detailed, professional guidance to expand and improve this content for a mining technical report.`;
            
            const fallbackResponse = await fetch('/api/standard-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: queryText,
                prompt: fallbackPrompt,
                systemMessage: systemMessage,
                maxTokens: 1024,
                temperature: 0.7,
              }),
            });

            if (!fallbackResponse.ok) {
              throw new Error(`AI API error: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
            }

            const fallbackData = await fallbackResponse.json();

            if (fallbackData.error) {
              throw new Error(fallbackData.error);
            }

            const aiResponse = fallbackData.answer || '';
            const fallbackMessage = `**Note**: RAG functionality is not available. Using standard AI assistance.\n\n${aiResponse}`;
            
            setAiMessages([
              ...aiMessages,
              { role: "system", content: systemMessage },
              { role: "user", content: "Expand using AI (RAG unavailable)" },
              { role: "assistant", content: fallbackMessage },
            ]);
            setAiState("complete");
            
          } catch (fallbackError) {
            console.error('❌ [AI] Fallback Error:', fallbackError);
            setAiMessages([
              ...aiMessages,
              { role: "assistant", content: `RAG Error: ${error instanceof Error ? error.message : 'Failed to expand using RAG.'}\n\nFallback Error: ${fallbackError instanceof Error ? fallbackError.message : 'Standard AI also failed.'}\n\n**To fix this**: Check your OpenAI API key configuration.` },
            ]);
            setAiState("error");
          }
        }

      } else {
        // Standard AI prompt - use our local API
        console.log('✨ [AI] Using standard prompt via local API...');
        
        try {
          const response = await fetch('/api/standard-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: queryText,
              prompt: prompt,
              systemMessage: systemMessage,
              maxTokens: 1024,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            throw new Error(`AI API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();

          if (data.error) {
            throw new Error(data.error);
          }

          const aiResponse = data.answer || '';
          setAiMessages([
            ...aiMessages,
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
            { role: "assistant", content: aiResponse },
          ]);
          setAiState("complete");

        } catch (error) {
          console.error('❌ [AI] Standard prompt error:', error);
          throw error;
        }
      }

    } catch (error) {
      console.error('❌ [AI] Error:', error);
      setAiMessages([
        ...aiMessages,
        { role: "assistant", content: `Error: ${error instanceof Error ? error.message : 'AI request failed'}` },
      ]);
      setAiState("error");
    }
  }, [selectedText, customPrompt, aiMessages]);

  // Copy AI response to clipboard
  const copyAIResponse = useCallback(async () => {
    if (!lastAiMessage?.content) return;
    
    try {
      await navigator.clipboard.writeText(lastAiMessage.content);
      console.log('✅ [AI] Response copied to clipboard');
    } catch (error) {
      console.error('❌ [AI] Failed to copy to clipboard:', error);
    }
  }, [lastAiMessage]);

  // Insert AI response into editor
  const insertAIResponse = useCallback(() => {
    if (!editor || !lastAiMessage?.content) return;

    try {
      const currentBlock = editor.getTextCursorPosition().block;
      editor.insertBlocks(
        [
          {
            type: "paragraph",
            content: lastAiMessage.content,
          },
        ],
        currentBlock,
        "after"
      );
      
      // Reset AI state
      setShowAI(false);
      setAiState("initial");
      setAiMessages([]);
      setCurrentPromptPage([]);
      
      console.log('✅ [AI] Response inserted into editor');
    } catch (error) {
      console.error('❌ [AI] Failed to insert response:', error);
    }
  }, [editor, lastAiMessage]);

     // Replace selected text with AI response
   const replaceWithAIResponse = useCallback(() => {
     if (!editor || !lastAiMessage?.content) return;

     try {
       // For BlockNote, we'll insert the content at the current cursor position
       const currentBlock = editor.getTextCursorPosition().block;
       editor.insertBlocks(
         [
           {
             type: "paragraph",
             content: lastAiMessage.content,
           },
         ],
         currentBlock,
         "after"
       );
       
       // Reset AI state
       setShowAI(false);
       setAiState("initial");
       setAiMessages([]);
       setCurrentPromptPage([]);
       
       console.log('✅ [AI] Content inserted with AI response');
     } catch (error) {
       console.error('❌ [AI] Failed to insert response:', error);
     }
   }, [editor, lastAiMessage]);

  // Event handlers
  const handleMenuClick = () => {
    if (!mounted) return;
    setShowWayfinder(!showWayfinder);
    setShowComments(false);
    setShowAI(false);
  };

  const handleCommentClick = () => {
    if (!mounted) return;
    setShowComments(!showComments);
    setShowWayfinder(false);
    setShowAI(false);
  };
  
  const handleAIClick = () => {
    if (!mounted) return;
    setShowAI(!showAI);
    setShowWayfinder(false);
    setShowComments(false);
    
    if (!showAI) {
      // Reset AI state when opening
      setAiState("initial");
      setAiMessages([]);
      setCurrentPromptPage([]);
    }
  };

  const handlePromptSelect = (option: any) => {
    if ('children' in option && option.children) {
      // Navigate to submenu
      setCurrentPromptPage([...currentPromptPage, option.text]);
    } else if (option.prompt) {
      // Execute prompt
      submitAIPrompt(option.prompt);
    }
  };

  const handlePromptBack = () => {
    setCurrentPromptPage(currentPromptPage.slice(0, -1));
  };

     const handleCustomPromptSubmit = () => {
     if (customPrompt.trim()) {
       submitAIPrompt(customPrompt);
     }
   };

   // Section navigation handler
   const handleSectionClick = (blockId: string) => {
     if (!editor || !mounted) return;

     try {
       const block = editor.topLevelBlocks.find(b => b.id === blockId);
       if (block) {
         editor.setTextCursorPosition(block, "start");
         
         setTimeout(() => {
           if (!mounted) return;
           const blockElement = document.querySelector(`[data-id="${blockId}"]`);
           if (blockElement) {
             blockElement.scrollIntoView({ 
               behavior: 'smooth', 
               block: 'start',
               inline: 'nearest'
             });
           }
         }, 100);
       }
     } catch (error) {
       console.error('Error navigating to section:', error);
     }

     if (mounted) {
       setShowWayfinder(false);
     }
   };

   // Section numbering helper
   const renderSectionNumber = (index: number, section: Section) => {
     const skipNumbering = ['qp certification', 'table of contents', 'disclaimer'];
     const shouldSkipNumber = skipNumbering.some(skip => 
       section.title.toLowerCase().includes(skip)
     );
     
     if (shouldSkipNumber) return null;
     
     if (section.level <= 2) {
       return <span className={styles.sectionNumber}>{index + 1}</span>;
     }
     
     return null;
   };

  // Simple bulletproof comment submission handler
  const handleCommentSubmit = useCallback(({ body }: { body: any }) => {
    const bodyString = JSON.stringify(body);
    const now = Date.now();
    
    // Check global submission lock
    if (isGloballySubmitting) {
      console.warn('[SUBMIT] Submission rejected: another submission is in progress.');
      return;
    }
    
    // Check for identical content submitted rapidly
    if (lastSubmissionContent === bodyString && now - lastSubmissionTime < 2000) {
      console.warn('[SUBMIT] Submission rejected: duplicate content.');
      return;
    }
    
    if (!createThread) {
      console.error('[SUBMIT] createThread function is not available.');
      return;
    }
    
    // Set global lock
    isGloballySubmitting = true;
    lastSubmissionContent = bodyString;
    lastSubmissionTime = now;
    setIsSubmittingComment(true);
    
    try {
      createThread({ 
        body,
        metadata: {
          resolved: false,
          quote: '',
          time: now
        }
      });
      
    } catch (error) {
      console.error('[SUBMIT] Failed to create thread:', error);
    } finally {
      // Release lock after a short delay
      setTimeout(() => {
        isGloballySubmitting = false;
        setIsSubmittingComment(false);
      }, 1500);
    }
  }, [createThread]);

  if (!mounted) {
    return null;
  }

  return (
    <div className={`${styles.floatingMenuContainer} ${!isVisible ? styles.hidden : ''}`} style={{ top: menuTop }}>
      {/* Table of Contents */}
      <div className={styles.menuButtonContainer} ref={wayfinderRef}>
        <Button
          kind="ghost"
          hasIconOnly
          renderIcon={Menu}
          iconDescription="Outline"
          onClick={handleMenuClick}
          className={`${styles.menuButton} ${showWayfinder ? styles.active : ''}`}
        />
        
        {showWayfinder && (
          <div className={styles.wayfinderPopup}>
            <div className={styles.wayfinderHeader}>
              <h3>Document Outline</h3>
            </div>
            
            {sections.length === 0 ? (
              <p className={styles.emptyState}>No headings found in document</p>
            ) : (
              <ul className={styles.sectionsList}>
                {sections.map((section, index) => {
                  const numberedSections = sections.filter((s, i) => {
                    const skipNumbering = ['qp certification', 'table of contents', 'disclaimer'];
                    const shouldSkip = skipNumbering.some(skip => 
                      s.title.toLowerCase().includes(skip)
                    );
                    return !shouldSkip && s.level <= 2 && i <= index;
                  });
                  const sectionNumber = numberedSections.length;

                  return (
                    <li
                      key={section.id}
                      className={`${styles.sectionItem} ${styles[`level${section.level}`]}`}
                      onClick={() => handleSectionClick(section.blockId)}
                    >
                      <div className={styles.sectionContent}>
                        {renderSectionNumber(sectionNumber - 1, section)}
                        <span className={styles.sectionTitle}>{section.title}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Comments */}
      <Button
        kind="ghost"
        hasIconOnly
        renderIcon={AddComment}
        iconDescription="Add Comments"
        onClick={handleCommentClick}
        className={`${styles.menuButton} ${showComments ? styles.active : ''}`}
      />

      {/* Comments Panel */}
      {showComments && threads && (
        <div className={styles.commentsPanel}>
          <div className={styles.commentsPanelHeader}>
            <h3>Comments</h3>
            <Button
              kind="ghost"
              hasIconOnly
              renderIcon={TrashCan}
              iconDescription="Clear Comments"
              onClick={() => {
                // Clear comments functionality
                console.log('Clear comments clicked');
              }}
              className={styles.clearCommentsButton}
            />
          </div>
          
          <div className={styles.threadsContainer}>
            {threads.map((thread) => (
              <Thread key={thread.id} thread={thread} className={styles.thread} />
            ))}
          </div>
          
          <div className={styles.composerContainer}>
            <Composer 
              onComposerSubmit={handleCommentSubmit}
              disabled={isSubmittingComment}
            />
          </div>
        </div>
      )}

      {/* AI Assist */}
      <Button
        kind="ghost"
        hasIconOnly
        renderIcon={AiGenerate}
        iconDescription="AI Assist"
        onClick={handleAIClick}
        className={`${styles.menuButton} ${showAI ? styles.active : ''}`}
      />

      {/* AI Panel */}
      {showAI && (
        <div className={styles.aiPanel} ref={aiRef}>
          <div className={styles.aiPanelHeader}>
            <h3>AI Assistant</h3>
            {selectedText && (
              <div className={styles.selectedTextInfo}>
                <span>Selected: {selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}</span>
              </div>
            )}
          </div>

          {/* AI Response Display */}
          {lastAiMessage && (
            <div className={styles.aiResponse}>
              <div className={styles.aiResponseContent}>
                {lastAiMessage.content}
              </div>
              <div className={styles.aiResponseActions}>
                <Button
                  kind="secondary"
                  size="sm"
                  renderIcon={Copy}
                  onClick={copyAIResponse}
                  iconDescription="Copy to clipboard"
                >
                  Copy
                </Button>
                <Button
                  kind="secondary"
                  size="sm"
                  onClick={insertAIResponse}
                  iconDescription="Insert as new paragraph"
                >
                  Insert
                </Button>
                {selectedText && (
                  <Button
                    kind="primary"
                    size="sm"
                    onClick={replaceWithAIResponse}
                    iconDescription="Replace selected text"
                  >
                    Replace
                  </Button>
                )}
                                 <Button
                   kind="ghost"
                   size="sm"
                   renderIcon={Reset}
                   onClick={() => {
                     // Regenerate with same prompt
                     const lastUserMessage = aiMessages.filter(m => m.role === "user").slice(-1)[0];
                     if (lastUserMessage) {
                       submitAIPrompt(lastUserMessage.content);
                     }
                   }}
                   iconDescription="Regenerate"
                 >
                   Regenerate
                 </Button>
              </div>
            </div>
          )}

          {/* AI Loading State */}
          {aiState === "loading" && (
            <div className={styles.aiLoading}>
              <Loading description="AI is thinking..." small />
            </div>
          )}

          {/* AI Prompts Menu */}
          {aiState === "initial" && (
            <div className={styles.aiPrompts} ref={commandRef}>
              {/* Back button for submenus */}
              {currentPromptPage.length > 0 && (
                <div className={styles.promptNavigation}>
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={ChevronLeft}
                    onClick={handlePromptBack}
                    iconDescription="Back"
                  >
                    Back
                  </Button>
                </div>
              )}

              {/* Current prompt options */}
              {currentPromptPage.length === 0 ? (
                // Main menu
                aiPromptGroups.map((group) => (
                  <div key={group.text} className={styles.promptGroup}>
                    <h4 className={styles.promptGroupTitle}>{group.text}</h4>
                    {group.options.map((option) => (
                      <button
                        key={option.text}
                        className={styles.promptOption}
                        onClick={() => handlePromptSelect(option)}
                      >
                        {option.icon && <span className={styles.promptIcon}>{option.icon}</span>}
                        <span>{option.text}</span>
                        {'children' in option && <span className={styles.promptArrow}>→</span>}
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                // Submenu
                selectedOption && 'children' in selectedOption && selectedOption.children ? (
                  <div className={styles.promptGroup}>
                    <h4 className={styles.promptGroupTitle}>{selectedOption.text}</h4>
                    {selectedOption.children.map((child) => (
                      <button
                        key={child.text}
                        className={styles.promptOption}
                        onClick={() => handlePromptSelect(child)}
                      >
                        <span>{child.text}</span>
                      </button>
                    ))}
                  </div>
                ) : null
              )}

                             {/* Custom prompt input */}
               <div className={styles.customPrompt}>
                 <TextArea
                   labelText="Custom Prompt"
                   placeholder="Or enter a custom prompt..."
                   value={customPrompt}
                   onChange={(e) => setCustomPrompt(e.target.value)}
                   rows={2}
                 />
                <Button
                  kind="primary"
                  size="sm"
                  renderIcon={Send}
                  onClick={handleCustomPromptSubmit}
                  disabled={!customPrompt.trim()}
                  iconDescription="Send custom prompt"
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <hr className={styles.separator} /> 

      {/* Permissions / Report Signing*/}
      <Button
        kind="ghost"
        hasIconOnly
        renderIcon={RuleLocked}
        iconDescription="Permissions"
        onClick={() => console.log('Permissions clicked')}
        className={styles.menuButton}
      />
    </div>
  );
};

// Utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}

export default FloatingEditorMenu;