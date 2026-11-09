const { state } = require('../whatsapp');

function registerHandlers(io, socket) {
  console.log('Client connected:', socket.id);

  if (state.qr) {
    socket.emit('qr', state.qr);
  }
  if (state.ready) {
    socket.emit('wa-ready');
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
}

module.exports = { registerHandlers };
