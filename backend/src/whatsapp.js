const { Client, LocalAuth, RemoteWebCache } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const { getAutomations } = require('./automations');

const state = {
  qr: null,
  ready: false,
};

let io = null;

const client = new Client({
  authStrategy: new LocalAuth(),
  webVersionCache: {
    type: 'none',
  },
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', async (qr) => {
  const dataUrl = await QRCode.toDataURL(qr);
  state.qr = dataUrl;
  state.ready = false;
  if (io) io.emit('qr', dataUrl);
  console.log('QR code generated');
});

client.on('authenticated', () => {
  console.log('WhatsApp authenticated');
  state.qr = null;
});

client.on('ready', () => {
  console.log('WhatsApp client ready');
  state.ready = true;
  state.qr = null;
  if (io) io.emit('wa-ready');
});

client.on('message', async (msg) => {
  if (io) {
    const id = msg.id._serialized || msg.id.$1 || msg.id.toString();
    let authorName;
    if (msg.author) {
      try {
        const contact = await msg.getContact();
        authorName = contact.name || contact.pushname || contact.number || msg.author.split('@')[0];
      } catch {
        authorName = msg.author.split('@')[0];
      }
    }
    io.emit('new-message', {
      id,
      body: msg.body,
      from: msg.from,
      to: msg.to,
      chatId: msg.from,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
      author: msg.author,
      authorName,
      type: msg.type,
    });
  }

  // Execute automations
  if (!msg.fromMe) {
    try {
      const chatId = msg.from;
      const rules = getAutomations(chatId);
      console.log(`Automation check: chatId=${chatId}, rules=${rules.length}, author=${msg.author}`);
      for (const rule of rules) {
        const memberMatch = rule.member === 'all' || rule.member === msg.author;
        console.log(`  Rule "${rule.name}": member=${rule.member}, match=${memberMatch}`);
        if (memberMatch && rule.automation === 'thumbs-up') {
          console.log('  -> Reacting with 👍');
          await msg.react('👍');
        }
      }
    } catch (e) {
      console.error('Automation error:', e);
    }
  }
});

client.on('message_reaction', (reaction) => {
  if (io) {
    const msgId = reaction.msgId?._serialized || reaction.msgId?.['$1'] || (reaction.msgId && reaction.msgId.toString());
    const senderId = reaction.senderId?._serialized || reaction.senderId?.['$1'] || reaction.senderId;
    io.emit('message-reaction', {
      msgId,
      reaction: reaction.reaction,
      senderId,
      timestamp: reaction.timestamp,
    });
  }
});

client.on('message_create', (msg) => {
  if (msg.fromMe && io) {
    const id = msg.id._serialized || msg.id.$1 || msg.id.toString();
    io.emit('new-message', {
      id,
      body: msg.body,
      from: msg.from,
      to: msg.to,
      chatId: msg.to,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
      author: msg.author,
      type: msg.type,
    });
  }
});

client.on('disconnected', (reason) => {
  console.log('WhatsApp disconnected:', reason);
  state.ready = false;
  state.qr = null;
  if (io) io.emit('wa-disconnected', { reason });
});

client.on('auth_failure', (msg) => {
  console.error('WhatsApp auth failure:', msg);
  if (io) io.emit('wa-auth-failure', { message: msg });
});

function setIO(socketIO) {
  io = socketIO;
}

client.initialize();

module.exports = { client, state, setIO };
