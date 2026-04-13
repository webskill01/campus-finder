require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { v2: cloudinary } = require('cloudinary');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const adminRoutes = require('./routes/admin');
const { general, authLimit } = require('./middleware/rateLimit');
const expiryJob = require('./jobs/expiry');

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Trust reverse proxy (nginx) so rate limiter sees real client IPs
app.set('trust proxy', 1);

// Security + parsing middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Rate limiting — general applies to all routes
app.use(general);

// Routes (specific rate limits applied before mounting)
app.use('/api/auth', authLimit, authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Start server + cron
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    expiryJob.start();
    console.log('Expiry cron job started');
  });
});

module.exports = app;
