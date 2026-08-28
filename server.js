const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const users = new Map();
const activeSockets = new Map();

io.on('connection', (socket) => {

  socket.on('register', ({ username, password }) => {
    if (!username || !password) return socket.emit('auth_error', 'Veuillez remplir tous les champs.');
    if (users.has(username)) {
      return socket.emit('auth_error', 'Ce pseudo est déjà pris.');
    }
    users.set(username, password);
    activeSockets.set(socket.id, username);
    socket.emit('auth_success', { username, action: 'registered' });
    io.emit('system_message', `${username} a rejoint Lisolo.`);
  });

  socket.on('login', ({ username, password }) => {
    if (!users.has(username) || users.get(username) !== password) {
      return socket.emit('auth_error', 'Identifiants incorrects.');
    }
    activeSockets.set(socket.id, username);
    socket.emit('auth_success', { username, action: 'logged_in' });
    io.emit('system_message', `${username} s'est connecté.`);
  });

  socket.on('send_message', (text) => {
    const username = activeSockets.get(socket.id);
    if (username && text && text.trim() !== '') {
      io.emit('receive_message', {
        user: username,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  socket.on('disconnect', () => {
    const username = activeSockets.get(socket.id);
    if (username) {
      activeSockets.delete(socket.id);
      io.emit('system_message', `${username} a quitté le tchat.`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur Lisolo lancé sur le port ${PORT}`);
});
