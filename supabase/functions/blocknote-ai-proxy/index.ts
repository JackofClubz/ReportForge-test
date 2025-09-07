import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the API key from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Parse the request body
    const { messages, maxTokens = 1024, temperature = 0.7 } = await req.json();

    // Format messages for OpenAI API compatibility
    const formattedMessages = formatMessagesForOpenAI(messages);

    // Make request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature: temperature,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API Error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    
    // Return the response in a format BlockNote expects
    // Convert OpenAI format to match what BlockNote AI extension expects
    const content = data.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({
      success: true,
      content: [{ type: 'text', text: content }],
      usage: data.usage,
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in BlockNote AI proxy:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});

/**
 * Format messages for OpenAI API compatibility
 * OpenAI supports system, user, and assistant messages
 */
function formatMessagesForOpenAI(messages: any[]): any[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  const formatted: any[] = [];

  for (const message of messages) {
    // OpenAI supports system, user, and assistant roles directly
    formatted.push({
      role: message.role,
      content: typeof message.content === 'string' ? message.content : 
               Array.isArray(message.content) ? 
               message.content.map(c => c.text || c.content).join('\n') : 
               String(message.content),
    });
  }

  return formatted;
} 