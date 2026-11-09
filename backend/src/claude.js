const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env['CLAUDE-API-KEY'],
});

const SYSTEM_PROMPT = `You are a participant in a WhatsApp chat. Follow these rules strictly:

1. NEVER share private or personal information about anyone.
2. NEVER make decisions or commitments on behalf of anyone (e.g. "I'll be there", "let's do it", "I agree").
3. Answer factual, non-private questions helpfully and concisely. Examples: weather, recipes, general knowledge, costs, trivia, phone numbers and addresses of public places (restaurants, offices, shops, etc.). Use web search to find up-to-date information.
4. Do not respond to casual reactions or acknowledgments like: "thanks", "ok", "no problem", "I'm good", "lol", "haha", "nice", "cool", etc. For these, respond with just a single fitting emoji reaction in the format __REACT__👍
5. If someone wishes happy birthday to someone, also wish that person happy birthday in a warm, original way. Never repeat the same birthday wish in the same chat.
6. If someone shares a link/URL, respond with exactly: __REACT__ followed by a single emoji that fits the link content (guess from the URL). For example: __REACT__🎵 for music, __REACT__📰 for news, __REACT__🎥 for video, __REACT__📸 for photos, __REACT__🔗 for generic links.
7. Always respond in the SAME LANGUAGE as the message you are responding to.
8. Keep responses short and natural — like a helpful friend in a group chat, not a formal assistant.
9. NEVER include URLs or links in your responses.
10. Always provide a response. Never refuse to respond.`;

/**
 * Generate an auto-response for a WhatsApp message.
 * @param {string} messageBody - The incoming message text
 * @param {Array<{role: string, body: string, authorName?: string}>} contextMessages - Recent messages for context
 * @param {string} [authorName] - Name of the message author
 * @returns {Promise<{type: 'reply'|'react'|'skip', text?: string, emoji?: string}>}
 */
async function generateAutoResponse(messageBody, contextMessages, authorName) {
  const messages = [];

  // Add context messages
  for (const ctx of contextMessages) {
    const prefix = ctx.authorName ? `[${ctx.authorName}]: ` : '';
    messages.push({
      role: ctx.fromMe ? 'assistant' : 'user',
      content: prefix + ctx.body,
    });
  }

  // Add the current message
  const currentPrefix = authorName ? `[${authorName}]: ` : '';
  messages.push({
    role: 'user',
    content: currentPrefix + messageBody,
  });

  // Merge consecutive same-role messages
  const merged = [];
  for (const m of messages) {
    if (merged.length > 0 && merged[merged.length - 1].role === m.role) {
      merged[merged.length - 1].content += '\n' + m.content;
    } else {
      merged.push({ ...m });
    }
  }

  // Ensure first message is 'user' role
  if (merged.length > 0 && merged[0].role === 'assistant') {
    merged[0].role = 'user';
    merged[0].content = '(previous bot message) ' + merged[0].content;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: merged,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }],
  });

  // Extract the final text from the response (may contain multiple content blocks after tool use)
  const raw = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!raw) {
    return { type: 'skip' };
  }

  // Extract __REACT__ if present (even mixed with other text)
  const reactMatch = raw.match(/__REACT__(\S+)/);
  if (reactMatch) {
    // If there's only the react token (no real text), just react
    const textWithoutReact = raw.replace(/__REACT__\S+/, '').trim();
    if (!textWithoutReact) {
      return { type: 'react', emoji: reactMatch[1] };
    }
    // If there's text alongside __REACT__, send the text as reply
    return { type: 'reply', text: textWithoutReact + ' \u1D2C\u1D35' };
  }

  // Strip any leftover __SKIP__ or similar tokens
  const clean = raw.replace(/__\w+__/g, '').trim();
  if (!clean) {
    return { type: 'skip' };
  }

  return { type: 'reply', text: clean + ' \u1D2C\u1D35' };
}

module.exports = { generateAutoResponse };
