import React from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { createAIExtension } from "@blocknote/xl-ai";
import { openai } from "@ai-sdk/openai";
import { en } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@blocknote/xl-ai/style.css";
import AppLayout from '../../components/layout/AppLayout';

const AISlashTest: React.FC = () => {
  console.log('🧪 [TEST] AISlashTest component rendered');
  console.log('🔑 [TEST] OpenAI API Key available:', !!(import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY));
  
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn,
    },
    extensions: [
      createAIExtension({
        model: openai('gpt-4o-mini', {
          apiKey: import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY,
        }),
      }),
    ],
    initialContent: [
      {
        type: "paragraph",
        content: "Type /ai to test the AI slash command"
      }
    ],
  });

  return (
    <AppLayout>
      <div style={{ padding: '2rem' }}>
        <h1>AI Slash Command Test</h1>
        <p>Try typing <code>/ai</code> in the editor below:</p>
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '1rem', minHeight: '400px' }}>
          <BlockNoteView editor={editor} theme="light" />
        </div>
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <h3>Debug Info:</h3>
          <p>OpenAI API Key configured: {(import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY) ? '✅ Yes' : '❌ No'}</p>
          <p>Editor initialized: {editor ? '✅ Yes' : '❌ No'}</p>
          <p>Check browser console for any errors</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AISlashTest;
