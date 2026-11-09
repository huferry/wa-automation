const { Client, LocalAuth, RemoteWebCache } = require('whatsapp-web.js');
const QRCode = require('qrcode');

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

client.on('message', (msg) => {
  if (io) {
    const id = msg.id._serialized || msg.id.$1 || msg.id.toString();
    io.emit('new-message', {
      id,
      body: msg.body,
      from: msg.from,
      to: msg.to,
      chatId: msg.from,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
      author: msg.author,
      type: msg.type,
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
