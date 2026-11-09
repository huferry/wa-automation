const express = require('express');
const { client, state } = require('../whatsapp');

function sid(obj) {
  if (!obj) return undefined;
  if (typeof obj === 'string') return obj;
  return obj._serialized || obj['$1'] || obj.toString();
}

// Cache for contact name resolution (supports both @c.us and @lid keys)
const nameCache = {};

async function resolveContactName(authorId) {
  if (!authorId) return undefined;
  if (nameCache[authorId]) return nameCache[authorId];
  try {
    const contact = await client.getContactById(authorId);
    const name = contact.name || contact.pushname || contact.number || authorId.split('@')[0];
    nameCache[authorId] = name;
    return name;
  } catch {
    return authorId.split('@')[0];
  }
}

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ qr: state.qr, ready: state.ready });
});

router.get('/chats', async (req, res) => {
  try {
    const chats = await client.getChats();
    const active = [];
    for (const chat of chats) {
      if (chat.archived) continue;
      let lastMessage = null;
      try {
        if (chat.lastMessage) {
          lastMessage = {
            body: chat.lastMessage.body || '',
            timestamp: chat.lastMessage.timestamp,
            fromMe: chat.lastMessage.fromMe,
            type: chat.lastMessage.type || 'chat',
          };
        }
      } catch (_) {}

      let profilePicUrl = null;
      try {
        profilePicUrl = await chat.getProfilePicUrl();
      } catch (_) {}

      active.push({
        id: sid(chat.id) || chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        lastMessage,
        timestamp: chat.timestamp,
        profilePicUrl,
      });
    }
    active.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json(active);
  } catch (err) {
    console.error('Error fetching chats:', err.stack || err);
    res.status(500).json({ error: 'Failed to fetch chats', details: String(err) });
  }
});

router.get('/chats/:chatId/messages', async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    const messages = await chat.fetchMessages({ limit: 50 });
    const mapped = await Promise.all(messages.map(async (msg) => ({
      id: sid(msg.id),
      body: msg.body,
      from: msg.from,
      to: msg.to,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
      author: msg.author,
      authorName: msg.fromMe ? undefined : await resolveContactName(msg.author),
      type: msg.type,
    })));
    res.json(mapped);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/chats/:chatId/messages', async (req, res) => {
  try {
    const { message } = req.body;
    const sent = await client.sendMessage(req.params.chatId, message);
    res.json({
      id: sid(sent.id),
      body: sent.body,
      from: sent.from,
      to: sent.to,
      timestamp: sent.timestamp,
      fromMe: sent.fromMe,
      type: sent.type,
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/contacts', async (req, res) => {
  try {
    const contacts = await client.getContacts();
    const list = contacts
      .filter((c) => c.isUser && !c.isMe)
      .map((c) => ({
        id: sid(c.id),
        name: c.name || c.pushname || c.number,
      }));
    res.json(list);
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

module.exports = router;
