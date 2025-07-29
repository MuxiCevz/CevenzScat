const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const MAX_MESSAGES = 1000;
const MAX_LENGTH = 2000;

const messagesPath = path.join(__dirname, 'CE', 'messages.json');

// Создаём CE/messages.json, если его нет
if (!fs.existsSync(path.dirname(messagesPath))) {
  fs.mkdirSync(path.dirname(messagesPath));
}
let messages = [];
if (fs.existsSync(messagesPath)) {
  try {
    messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
  } catch (e) {
    messages = [];
  }
}

// Раздаём статику из public
app.use(express.static('public'));

// WebSocket
io.on('connection', socket => {
  // Отдаём историю при подключении
  socket.emit('history', messages);

  socket.on('send', text => {
    if (typeof text !== 'string') return;
    text = text.trim();
    if (text.length === 0 || text.length > MAX_LENGTH) return;

    const msg = { id: uuid(), user: 'anon', text, ts: Date.now() };
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();

    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2), 'utf8');
    io.emit('newMessage', msg);
  });
});

server.listen(PORT, () => {
  console.log(`Server running http://localhost:${PORT}`);
});