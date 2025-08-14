import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the API key from environment variables
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Parse the request body
    const { messages, maxTokens = 1024, temperature = 0.7 } = await req.json();

    // Format messages for Anthropic API compatibility
    // Anthropic requires alternating user/assistant messages
    const formattedMessages = formatMessagesForAnthropic(messages);

    // Make request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        temperature: temperature,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API Error:', errorData);
      throw new Error(`Anthropic API Error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    
    // Return the response in a format BlockNote expects
    return new Response(JSON.stringify({
      success: true,
      content: data.content,
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
 * Format messages for Anthropic API compatibility
 * Anthropic requires alternating user/assistant messages and doesn't support
 * multiple system messages separated by user/assistant messages
 */
function formatMessagesForAnthropic(messages: any[]): any[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  const formatted: any[] = [];
  let lastRole = '';

  for (const message of messages) {
    // Skip system messages after the first one (Anthropic limitation)
    if (message.role === 'system' && formatted.length > 0) {
      continue;
    }

    // Merge consecutive messages from the same role
    if (message.role === lastRole && formatted.length > 0) {
      const lastMessage = formatted[formatted.length - 1];
      if (typeof lastMessage.content === 'string' && typeof message.content === 'string') {
        lastMessage.content = lastMessage.content + '\n\n' + message.content;
      } else {
        // Handle complex content blocks
        if (!Array.isArray(lastMessage.content)) {
          lastMessage.content = [{ type: 'text', text: lastMessage.content }];
        }
        if (Array.isArray(message.content)) {
          lastMessage.content.push(...message.content);
        } else {
          lastMessage.content.push({ type: 'text', text: message.content });
        }
      }
    } else {
      formatted.push({
        role: message.role === 'system' ? 'user' : message.role, // Convert system to user for compatibility
        content: message.content,
      });
      lastRole = message.role === 'system' ? 'user' : message.role;
    }
  }

  return formatted;
} 