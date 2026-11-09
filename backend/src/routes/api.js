const express = require('express');
const { client, state } = require('../whatsapp');

function sid(obj) {
  if (!obj) return undefined;
  if (typeof obj === 'string') return obj;
  return obj._serialized || obj['$1'] || obj.toString();
}

// Cache contacts for resolving names
let contactsCache = {};

async function refreshContacts() {
  try {
    const contacts = await client.getContacts();
    const map = {};
    for (const c of contacts) {
      const id = sid(c.id);
      if (id) {
        map[id] = {
          name: c.name || c.pushname || c.number || id.split('@')[0],
          shortName: c.shortName || c.pushname || c.name || c.number || id.split('@')[0],
        };
      }
    }
    contactsCache = map;
  } catch (e) {
    console.error('Failed to refresh contacts:', e);
  }
}

// Refresh contacts when client is ready and periodically
client.on('ready', () => setTimeout(refreshContacts, 2000));

function resolveContactName(authorId) {
  if (!authorId) return undefined;
  const contact = contactsCache[authorId];
  if (contact) return contact.shortName;
  // Fallback: strip @c.us / @lid
  return authorId.split('@')[0];
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
    const mapped = messages.map((msg) => ({
      id: sid(msg.id),
      body: msg.body,
      from: msg.from,
      to: msg.to,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
      author: msg.author,
      authorName: resolveContactName(msg.author),
      type: msg.type,
    }));
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
    if (Object.keys(contactsCache).length === 0) {
      await refreshContacts();
    }
    const list = Object.entries(contactsCache).map(([id, c]) => ({
      id,
      name: c.name,
    }));
    res.json(list);
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

module.exports = router;
