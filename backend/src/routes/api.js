const express = require('express');
const { client, state } = require('../whatsapp');
const automations = require('../automations');

function sid(obj) {
  if (!obj) return undefined;
  if (typeof obj === 'string') return obj;
  return obj._serialized || obj['$1'] || obj.toString();
}

// Cache for contact name resolution (supports both @c.us and @lid keys)
const nameCache = {};

// Cache for message reactions: msgId -> { reactions, ts }
const reactionsCache = {};
const REACTIONS_TTL = 60_000; // 1 minute

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
  const meId = client.info?.wid ? sid(client.info.wid) : null;
  res.json({ qr: state.qr, ready: state.ready, meId });
});

router.get('/chats', async (req, res) => {
  try {
    const chats = await client.getChats();
    const filtered = chats.filter((chat) => {
      if (chat.archived) return false;
      const id = sid(chat.id) || '';
      if (id === 'status@broadcast' || id.endsWith('@broadcast')) return false;
      return true;
    });

    const active = await Promise.all(
      filtered.map(async (chat) => {
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

        const chatId = sid(chat.id) || chat.id._serialized;
        const isGroup = chatId.endsWith('@g.us');
        let name = chat.name;
        if (!name && isGroup) {
          try {
            const contact = await Promise.race([
              client.getContactById(chatId),
              new Promise((_, reject) => setTimeout(() => reject(), 1000)),
            ]);
            name = contact.name || contact.pushname || null;
          } catch {}
        }
        return {
          id: chatId,
          name: name || (isGroup ? 'Unknown Group' : chatId.split('@')[0]),
          isGroup,
          unreadCount: chat.unreadCount,
          lastMessage,
          timestamp: chat.timestamp,
        };
      })
    );

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

    // Resolve all contact names in parallel first
    const authorIds = [...new Set(messages.filter((m) => !m.fromMe && m.author).map((m) => m.author))];
    await Promise.all(authorIds.map((id) => resolveContactName(id)));

    const mapped = await Promise.all(messages.map(async (msg) => {
      const msgId = sid(msg.id);
      let reactions = [];
      try {
        const cached = reactionsCache[msgId];
        if (cached && Date.now() - cached.ts < REACTIONS_TTL) {
          reactions = cached.reactions;
        } else {
          const rawReactions = await msg.getReactions();
          if (rawReactions) {
            for (const group of rawReactions) {
              for (const r of group.senders) {
                reactions.push({
                  reaction: group.id,
                  senderId: r.senderId,
                  timestamp: r.timestamp,
                });
              }
            }
          }
          reactionsCache[msgId] = { reactions, ts: Date.now() };
        }
      } catch (_) {}
      return {
        id: msgId,
        body: msg.body,
        from: msg.from,
        to: msg.to,
        timestamp: msg.timestamp,
        fromMe: msg.fromMe,
        author: msg.author,
        authorName: msg.fromMe ? undefined : nameCache[msg.author],
        type: msg.type,
        reactions,
      };
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

// Automation chat IDs (which chats have automations)
router.get('/automations/chats', (req, res) => {
  const all = automations.getAllAutomations();
  res.json(Object.keys(all).filter((k) => all[k].length > 0));
});

// Automations CRUD
router.get('/chats/:chatId/automations', (req, res) => {
  res.json(automations.getAutomations(req.params.chatId));
});

router.post('/chats/:chatId/automations', (req, res) => {
  const { name, member, automation } = req.body;
  if (!name || !automation) {
    return res.status(400).json({ error: 'Missing name or automation type' });
  }
  const rule = automations.addAutomation(req.params.chatId, {
    name,
    member: member || 'all',
    automation,
  });
  res.json(rule);
});

router.put('/chats/:chatId/automations/:ruleId', (req, res) => {
  const { name, member, automation } = req.body;
  const updated = automations.updateAutomation(req.params.chatId, req.params.ruleId, {
    name,
    member,
    automation,
  });
  if (!updated) return res.status(404).json({ error: 'Automation not found' });
  res.json(updated);
});

router.delete('/chats/:chatId/automations/:ruleId', (req, res) => {
  const deleted = automations.deleteAutomation(req.params.chatId, req.params.ruleId);
  if (!deleted) return res.status(404).json({ error: 'Automation not found' });
  res.json({ status: 'deleted' });
});

// Group participants
router.get('/chats/:chatId/participants', async (req, res) => {
  try {
    const chat = await client.getChatById(req.params.chatId);
    if (!chat.isGroup) {
      return res.json([]);
    }
    const participants = chat.participants || [];
    const mapped = await Promise.all(
      participants.map(async (p) => {
        const id = sid(p.id);
        let name = id.split('@')[0];
        try {
          const contact = await client.getContactById(id);
          name = contact.name || contact.pushname || contact.number || name;
        } catch {}
        return { id, name };
      })
    );
    res.json(mapped);
  } catch (err) {
    console.error('Error fetching participants:', err);
    res.status(500).json({ error: 'Failed to fetch participants' });
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
