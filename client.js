const socket = io();
const chat = document.getElementById('chat');
const form = document.getElementById('form');
const input = document.getElementById('input');

// Получаем историю
socket.on('history', msgs => msgs.forEach(addMsg));

// Новое сообщение
socket.on('newMessage', addMsg);

// Отправка
form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  socket.emit('send', text);
  input.value = '';
});

function addMsg({ user, text }) {
  const div = document.createElement('div');
  div.className = 'msg';
  div.textContent = `${user}: ${text}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}