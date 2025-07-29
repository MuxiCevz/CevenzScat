const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const fs      = require('fs');
const path    = require('path');
const { v4: uuid } = require('uuid');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const MAX_MESSAGES = 1000;

/* пути */
const dataDir = path.join(__dirname, 'CE');
const messagesPath = path.join(dataDir, 'messages.json');
const usersPath    = path.join(dataDir, 'users.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

/* helpers */
const load = (file, def = []) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : def;
const save = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

let messages = load(messagesPath);
let users    = load(usersPath);

/* middleware */
app.use(express.json());
app.use(express.static('public'));

/* регистрация / вход */
app.post('/api/login', (req, res) => {
  const { name, phone, pass, code } = req.body || {};
  if (!name || !phone || !pass || !code) return res.status(400).json({ error: 'bad data' });
  let user = users.find(u => u.name === name && u.phone === phone && u.pass === pass && u.code === code);
  if (!user) {
    user = { id: uuid(), name, phone, pass, code };
    users.push(user);
    save(usersPath, users);
  }
  res.json(user);
});

/* socket */
io.on('connection', socket => {
  socket.emit('history', messages);

  socket.on('send', ({ text, user }) => {
    if (typeof text !== 'string' || !user) return;
    const txt = text.trim();
    if (!txt || txt.length > 2000) return;
    const msg = { id: uuid(), user: user.name || 'anon', text: txt, ts: Date.now() };
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages.shift();
    save(messagesPath, messages);
    io.emit('newMessage', msg);
  });

  socket.on('delete', id => {
    messages = messages.filter(m => m.id !== id);
    save(messagesPath, messages);
    io.emit('messageDeleted', id);
  });

  socket.on('clear', () => {
    messages = [];
    save(messagesPath, messages);
    io.emit('cleared');
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
