/*  server.js  Cevenz Scat Beta 3.1  */
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const fs      = require('fs');
const path    = require('path');
const { v4: uuid } = require('uuid');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_MESSAGES = 1000;
const MAX_LENGTH   = 2000;

const messagesPath = path.join(__dirname, 'CE', 'messages.json');
const usersPath    = path.join(__dirname, 'CE', 'users.json');

/* создаём CE, если нет */
if (!fs.existsSync(path.dirname(messagesPath))) {
  fs.mkdirSync(path.dirname(messagesPath), { recursive: true });
}
let messages = [];
if (fs.existsSync(messagesPath)) {
  try { messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8')); } catch { messages = []; }
}
let users = [];
if (fs.existsSync(usersPath)) {
  try { users = JSON.parse(fs.readFileSync(usersPath, 'utf8')); } catch { users = []; }
}

/* middleware */
app.use(express.json());
app.use(express.static('public'));

/* REST API регистрация / вход */
app.post('/api/login', (req, res) => {
  const { name, phone, pass, code } = req.body || {};
  if (!name || !phone || !pass || !code) return res.status(400).json({ error: 'bad data' });

  let user = users.find(u => u.name === name && u.phone === phone && u.pass === pass && u.code === code);
  if (!user) {
    user = { id: uuid(), name, phone, pass, code };
    users.push(user);
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
  }
  res.json(user);
});

/* Socket */
io.on('connection', socket => {
  socket.on('getHistory', () => socket.emit('history', messages));

  socket.on('send', ({ text, user }) => {
    if (typeof text !== 'string' || !user) return;
    const txt = text.trim();
    if (!txt || txt.length > MAX_LENGTH) return;

    const msg = { id: uuid(), user: user.name || 'anon', text: txt, ts: Date.now() };
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2), 'utf8');
    io.emit('newMessage', msg);
  });

  socket.on('delete', id => {
    messages = messages.filter(m => m.id !== id);
    fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2), 'utf8');
    io.emit('messageDeleted', id);
  });

  socket.on('clear', () => {
    messages = [];
    fs.writeFileSync(messagesPath, '[]', 'utf8');
    io.emit('cleared');
  });
});

server.listen(PORT, () => {
  console.log(`Cevenz Scat running at http://localhost:${PORT}`);
});
