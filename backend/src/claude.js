const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env['CLAUDE-API-KEY'],
});

function buildSystemPrompt(options = {}) {
  let prompt = `You are a participant in a WhatsApp chat. Follow these rules strictly:

1. NEVER share private or personal information about anyone.
2. NEVER make decisions or commitments on behalf of anyone (e.g. "I'll be there", "let's do it", "I agree").
3. Answer factual, non-private questions helpfully and concisely. Examples: weather, recipes, general knowledge, costs, trivia, phone numbers and addresses of public places (restaurants, offices, shops, etc.). Use web search to find up-to-date information.
4. Do not respond to casual reactions or acknowledgments like: "thanks", "ok", "no problem", "I'm good", "lol", "haha", "nice", "cool", etc. For these, respond with just a single fitting emoji reaction in the format __REACT__👍
5. Always respond in the SAME LANGUAGE as the message you are responding to.
6. Keep responses short and natural — like a helpful friend in a group chat, not a formal assistant.
7. NEVER include URLs or links in your responses.
8. Always provide a response. Never refuse to respond.`;

  if (options.birthdayWish) {
    prompt += `\n9. If someone wishes happy birthday to someone, also wish that person happy birthday in a warm, original way. Never repeat the same birthday wish in the same chat.`;
  }

  if (options.linkReaction) {
    prompt += `\n${options.birthdayWish ? '10' : '9'}. If someone shares a link/URL, respond with exactly: __REACT__ followed by a single emoji that fits the link content (guess from the URL). For example: __REACT__🎵 for music, __REACT__📰 for news, __REACT__🎥 for video, __REACT__📸 for photos, __REACT__🔗 for generic links.`;
  }

  return prompt;
}

/**
 * Generate an auto-response for a WhatsApp message.
 * @param {string} messageBody - The incoming message text
 * @param {Array<{role: string, body: string, authorName?: string}>} contextMessages - Recent messages for context
 * @param {string} [authorName] - Name of the message author
 * @param {object} [options] - { birthdayWish: boolean, linkReaction: boolean }
 * @returns {Promise<{type: 'reply'|'react'|'skip', text?: string, emoji?: string}>}
 */
const AI_MARKER = ' \u1D2C\u1D35';

async function generateAutoResponse(messageBody, contextMessages, authorName, options) {
  const messages = [];

  // Add context messages, stripping AI marker from previous bot replies
  for (const ctx of contextMessages) {
    const prefix = ctx.authorName ? `[${ctx.authorName}]: ` : '';
    const body = (ctx.body || '').replace(/ \u1D2C\u1D35/g, '');
    messages.push({
      role: ctx.fromMe ? 'assistant' : 'user',
      content: prefix + body,
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
    system: buildSystemPrompt(options),
    messages: merged,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }],
  });

  // Log token usage
  const usage = response.usage || {};
  const inputCost = (usage.input_tokens || 0) / 1_000_000 * 3;
  const outputCost = (usage.output_tokens || 0) / 1_000_000 * 15;
  const total = inputCost + outputCost;
  console.log(`  Claude tokens: in=${usage.input_tokens}, out=${usage.output_tokens}, cost=$${total.toFixed(4)}`);

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
    const cleanText = textWithoutReact.replace(/ \u1D2C\u1D35/g, '').trim();
    return { type: 'reply', text: cleanText + AI_MARKER };
  }

  // Strip any leftover tokens, AI markers, and collapse empty lines
  const clean = raw.replace(/__\w+__/g, '').replace(/ \u1D2C\u1D35/g, '').replace(/\n{2,}/g, '\n').trim();
  if (!clean) {
    return { type: 'skip' };
  }

  return { type: 'reply', text: clean + AI_MARKER };
}

module.exports = { generateAutoResponse };
