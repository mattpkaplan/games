const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const rateLimit = require('express-rate-limit');

const playersRouter = require('./routes/players');
const sessionsRouter = require('./routes/sessions');

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.BASE_URL
    : 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

// Serve uploaded avatars
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'data/uploads');
app.use('/uploads', express.static(uploadDir));

// Rate limit session creation (invites)
const sessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many invites, try again later' },
});

app.use('/api/players', playersRouter);
app.use('/api/sessions', sessionLimiter, sessionsRouter);

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

module.exports = app;
