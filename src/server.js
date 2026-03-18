require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const ordersPublicRoutes = require('./routes/ordersPublic');
const wishlistRoutes = require('./routes/wishlist');

const app = express();
const PORT = process.env.PORT || 5000;

const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origins.length ? origins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersPublicRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  if (err && err.message === 'Only image files allowed') {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal error' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`API http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
