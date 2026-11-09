const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { setIO } = require('./whatsapp');
const apiRoutes = require('./routes/api');
const { registerHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());
app.use('/api', apiRoutes);

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '..', 'public');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

setIO(io);

io.on('connection', (socket) => {
  registerHandlers(io, socket);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
