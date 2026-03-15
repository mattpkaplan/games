require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { setupSockets } = require('./socket');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.BASE_URL
      : 'http://localhost:5173',
    credentials: true,
  },
});

// Make io accessible in route handlers
app.set('io', io);

setupSockets(io);

server.listen(PORT, () => {
  console.log(`Family Games server running on port ${PORT}`);
});
