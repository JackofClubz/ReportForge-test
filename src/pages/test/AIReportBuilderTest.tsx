import React, { useState } from 'react';
import { Button, Tile, Grid, Column, TextArea, InlineNotification, Tag, Loading } from '@carbon/react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { FormattingToolbar, FormattingToolbarController } from "@blocknote/react";
import { en } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import {
    createAIExtension,
    AIMenuController,
    AIMenu,
  } from "@blocknote/xl-ai";
import { anthropic } from "@ai-sdk/anthropic";
import "@blocknote/xl-ai/style.css"; 
import AppLayout from '../../components/layout/AppLayout';
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

const AIReportBuilderTest: React.FC = () => {
  console.log('🎬 [COMPONENT] AIReportBuilderTest component rendered');
  
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  // Initialize BlockNote editor (without AI extension for now)
  const editor = useCreateBlockNote({
    dictionary: {
        ...en,
        ai: aiEn, // Add default translations for the AI extension
      },
      extensions: [
        createAIExtension({
          model: anthropic('claude-3-5-sonnet-20241022'),
        }),
      ],
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to the AI-Powered Report Builder Test! 🤖"
      },
      {
        type: "paragraph", 
        content: "Use the AI panel below to generate content, then copy it into the editor."
      },
      {
        type: "heading",
        props: { level: 2 },
        content: "Sample Mining Report"
      },
      {
        type: "paragraph",
        content: "Start writing your content here, or use the AI assistant below to generate text..."
      }
    ],
    uploadFile: async () => {
      console.log('📎 [EDITOR] uploadFile called (mock)');
      return "";
    }
  });

  // Function to call our Supabase Edge Function proxy
  const generateAIContent = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLastResponse(null);

    try {
      console.log('🤖 [AI] Making request to Supabase Edge Function proxy...');
      
      // Note: Update this URL to match your Supabase project
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blocknote-ai-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: aiPrompt
            }
          ],
          maxTokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'AI request failed');
      }

      const generatedText = data.content?.[0]?.text || '';
      setLastResponse(generatedText);
      
      console.log('✅ [AI] Successfully generated content');
      
    } catch (error) {
      console.error('❌ [AI] Error calling AI proxy:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate AI content');
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to insert AI-generated content into the editor
  const insertIntoEditor = () => {
    if (!lastResponse) return;
    
    const currentBlock = editor.getTextCursorPosition().block;
    editor.insertBlocks(
      [
        {
          type: "paragraph",
          content: lastResponse,
        },
      ],
      currentBlock,
      "after"
    );
    
    setLastResponse(null);
    setAiPrompt('');
  };

  return (
    <AppLayout hideSidebar>
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>AI-Powered Report Builder Test</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Tag type="green">Supabase Edge Function</Tag>
            <Tag type="blue">Claude 3.5 Sonnet</Tag>
          </div>
        </div>
        
        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f4f4f4', borderRadius: '4px' }}>
          <h4>Testing AI Integration:</h4>
          <p>This version uses a Supabase Edge Function as a proxy to call Claude's API, solving CORS and compatibility issues.</p>
        </div>
        
        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
            style={{ marginBottom: '1rem' }}
          />
        )}

        <Grid>
          <Column lg={10} md={6} sm={4}>
            <div style={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: '4px', 
              minHeight: '500px',
              backgroundColor: '#fff',
              position: 'relative'
            }}>
              <BlockNoteView 
                editor={editor}
                theme="light"
              >
                <AIMenuController
                  aiMenu={() => (
                    <AIMenu />
                  )}
                />

            
                <FormattingToolbarController
                  formattingToolbar={() => (
                    <FormattingToolbar />
                  )}
                />
              </BlockNoteView>
            </div>
          </Column>
          
          <Column lg={6} md={2} sm={4}>
            <Tile style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ marginBottom: '1rem' }}>AI Assistant</h4>
              
              <TextArea
                labelText="AI Prompt"
                placeholder="Enter your prompt here... (e.g., 'Write an introduction for a mining safety report')"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                style={{ marginBottom: '1rem' }}
                disabled={isGenerating}
              />
              
              <Button
                onClick={generateAIContent}
                disabled={isGenerating || !aiPrompt.trim()}
                style={{ marginBottom: '1rem' }}
              >
                {isGenerating ? (
                  <>
                    <Loading style={{ marginRight: '8px' }} />
                    Generating...
                  </>
                ) : (
                  'Generate AI Content'
                )}
              </Button>
              
              {lastResponse && (
                <div style={{ 
                  border: '1px solid #d0d0d0', 
                  borderRadius: '4px', 
                  padding: '1rem', 
                  backgroundColor: '#f9f9f9',
                  flex: 1,
                  marginBottom: '1rem',
                  overflow: 'auto'
                }}>
                  <h5>Generated Content:</h5>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: '1.4' }}>
                    {lastResponse}
                  </p>
                </div>
              )}
              
              {lastResponse && (
                <Button
                  kind="secondary"
                  onClick={insertIntoEditor}
                  style={{ marginTop: 'auto' }}
                >
                  Insert into Editor
                </Button>
              )}
            </Tile>
          </Column>
        </Grid>
        
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          <p><strong>Note:</strong> This uses a Supabase Edge Function proxy to call Claude's API server-side, avoiding CORS issues.</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AIReportBuilderTest; 