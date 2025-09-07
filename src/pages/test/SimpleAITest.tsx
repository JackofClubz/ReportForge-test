import React from "react";
import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  createAIExtension,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import { openai } from "@ai-sdk/openai";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@blocknote/xl-ai/style.css";
import AppLayout from '../../components/layout/AppLayout';

const SimpleAITest: React.FC = () => {
  console.log('🧪 [SIMPLE TEST] Component rendered');
  console.log('🔑 [SIMPLE TEST] VITE_OPENAI_API_KEY:', import.meta.env.VITE_OPENAI_API_KEY ? 'Found' : 'Not found');
  console.log('🔑 [SIMPLE TEST] OPENAI_API_KEY:', import.meta.env.OPENAI_API_KEY ? 'Found' : 'Not found');
  console.log('🔑 [SIMPLE TEST] API Key length:', (import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY)?.length);
  console.log('🔑 [SIMPLE TEST] API Key starts with sk-:', (import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY)?.startsWith('sk-'));
  
  // Create the OpenAI model with timeout and error handling
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
  
  // Try direct OpenAI API call first to see if CORS is really the issue
  const model = openai('gpt-4o-mini', {
    apiKey: apiKey,
  });

  // Add debugging for AI requests
  React.useEffect(() => {
    console.log('🤖 [AI MODEL] Model configured with API key:', !!apiKey);
    if (!apiKey) {
      console.error('❌ [AI MODEL] No API key found! Check your .env file');
    } else {
      console.log('✅ [AI MODEL] API key found, length:', apiKey.length);
    }
  }, [apiKey]);

  // Test function to check OpenAI API directly
  const testOpenAIDirectly = async () => {
    console.log('🧪 [TEST] Testing OpenAI API directly...');
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say "Hello World"' }],
          max_tokens: 10,
        }),
      });
      
      const data = await response.json();
      console.log('✅ [TEST] OpenAI API response:', data);
    } catch (error) {
      console.error('❌ [TEST] OpenAI API error:', error);
    }
  };

  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn,
    },
    extensions: [
      createAIExtension({
        model,
      }),
    ],
    initialContent: [
      {
        type: "paragraph",
        content: "Type / to see available commands. Look for AI options!"
      }
    ],
  });

  // Custom suggestion menu with AI items
  function SuggestionMenuWithAI(props: { editor: BlockNoteEditor<any, any, any> }) {
    return (
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(props.editor),
              // Add the AI slash menu items
              ...getAISlashMenuItems(props.editor),
            ],
            query
          )
        }
      />
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: '2rem' }}>
        <h1>Simple AI Test</h1>
        <p>This is the simplest possible AI setup. Try typing <code>/</code> to see all available commands.</p>
        <div style={{ 
          border: '1px solid #ccc', 
          borderRadius: '8px', 
          padding: '1rem', 
          minHeight: '400px',
          backgroundColor: 'white'
        }}>
          <BlockNoteView 
            editor={editor} 
            theme="light"
            slashMenu={false}
          >
            <SuggestionMenuWithAI editor={editor} />
          </BlockNoteView>
        </div>
        <div style={{ marginTop: '1rem', fontSize: '0.9em', color: '#666' }}>
          <p><strong>Instructions:</strong></p>
          <ul>
            <li>Click in the editor above</li>
            <li>Type <code>/</code> to open the slash menu</li>
            <li>Look for AI-related options like "AI Generate", "AI Edit", etc.</li>
            <li>If you see AI options, the extension is working!</li>
            <li><strong>Check browser console</strong> for debug information about AI slash menu items</li>
          </ul>
          <p><strong>Debugging:</strong> Open browser DevTools → Console to see AI extension debug logs</p>
          
          <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h4>API Test:</h4>
            <button 
              onClick={testOpenAIDirectly}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              Test OpenAI API Directly
            </button>
            <p style={{ fontSize: '0.8em', marginTop: '8px' }}>
              Click this button to test if the OpenAI API is working. Check console for results.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SimpleAITest;
