require('dotenv').config();
const express = require('express');
const path = require('path');
const ZaloBot = require('node-zalo-bot');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware configuration
// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, filePath) => {
    const filename = path.basename(filePath);
    if (filename === 'package.json' || filename === 'vercel.json' || filename.startsWith('.env')) {
      res.status(403).end();
    }
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const BOT_TOKEN = process.env.BOT_TOKEN;

// Initialize Zalo Bot (Singleton Pattern)
let bot;
function getBot() {
  if (bot) return bot;

  if (!BOT_TOKEN || BOT_TOKEN === 'BOT_TOKEN') {
    console.warn('⚠️ BOT_TOKEN is missing or invalid.');
    return null;
  }

  try {
    const isVercel = !!process.env.VERCEL;

    // Configuration for ZaloBot
    const botOptions = {
      polling: !isVercel,
      // On Vercel, the filesystem is read-only. We redirect persistence to /tmp
      filepath: isVercel ? '/tmp/zalo-bot-api.json' : 'zalo-bot-api.json'
    };

    bot = new ZaloBot(BOT_TOKEN, botOptions);

    if (!isVercel) {
      bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, `Chào ${msg.from.display_name}! Tôi là chatbot!`);
      });

      bot.onText(/\/echo (.+)/, (msg, match) => {
        const message = match[1];
        if (message) {
          bot.sendMessage(msg.chat.id, `Bạn vừa nói: ${message}`);
        }
      });

      bot.on("message", (msg) => {
        console.log("📨 Nhận tin nhắn mới:", msg.text);
      });

      console.log('✅ Zalo Bot initialized with polling enabled (Local mode)');
    } else {
      console.log('✅ Zalo Bot initialized in Serverless mode (Vercel)');
    }

    return bot;
  } catch (error) {
    console.error('❌ Error initializing Zalo Bot:', error.message);
    return null;
  }
}

// Pre-initialize bot in local environment
if (!process.env.VERCEL) {
  getBot();
}

/**
 * ✅ SEND MESSAGE ROUTE
 */
app.post('/send-message', async (req, res) => {
  const { user_id, message } = req.body;
  const currentBot = getBot();

  if (!currentBot) {
    return res.status(503).json({ error: 'Zalo Bot is not configured correctly' });
  }

  if (!user_id || !message) {
    return res.status(400).json({ error: 'Missing user_id or message' });
  }

  try {
    console.log('📤 Sending message to:', user_id);
    const result = await currentBot.sendMessage(user_id, message);
    console.log('✅ Message sent successfully');
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ ERROR sending message:', error.message);
    res.status(500).json({
      error: 'Failed to send message via Zalo Bot',
      details: error.message
    });
  }
});

/**
 * ✅ Health Check / Status
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: process.env.VERCEL ? 'vercel' : 'local',
    bot_ready: !!bot
  });
});

/**
 * ✅ Get Updates (Shim for compatibility)
 */
app.get('/get-updates', (req, res) => {
  res.json({
    success: true,
    message: "Polling is handled internally by the bot library in local mode. In serverless mode, use webhooks."
  });
});

/**
 * ✅ FALLBACK TO SERVE index.html
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server for local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🧪 Test UI: http://localhost:${PORT}`);
  });
}

module.exports = app;
