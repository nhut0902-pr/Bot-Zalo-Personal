require('dotenv').config();
const express = require('express');
const path = require('path');
const ZaloBot = require('node-zalo-bot');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware configuration
app.use(express.static(path.join(__dirname, '..'), {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.json') || path.endsWith('.env')) {
      res.status(403).end();
    }
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const BOT_TOKEN = process.env.BOT_TOKEN;

// Initialize Zalo Bot
let bot;
try {
  if (BOT_TOKEN && BOT_TOKEN !== 'BOT_TOKEN') {
    bot = new ZaloBot(BOT_TOKEN, {
      polling: true
    });

    bot.onText(/\/start/, (msg, match) => {
      bot.sendMessage(
        msg.chat.id,
        `Chào ${msg.from.display_name}! Tôi là chatbot!`
      );
    });

    bot.onText(/\/echo (.+)/, (msg, match) => {
      let message = match[1];
      if (message) {
        bot.sendMessage(msg.chat.id, `Bạn vừa nói: ${message}`);
      } else {
        bot.sendMessage(msg.chat.id, "Hãy nhập gì đó sau lệnh /echo");
      }
    });

    bot.on("message", (msg) => {
      console.log("Bạn vừa nhận được tin nhắn mới", msg);
    });

    console.log('✅ Zalo Bot initialized successfully');
  } else {
    console.warn('⚠️ BOT_TOKEN not provided or invalid. Bot features will be disabled.');
  }
} catch (error) {
  console.error('❌ Error initializing Zalo Bot:', error.message);
}

/**
 * ✅ HOME ROUTE
 * Explicitly serve index.html for the root path
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

/**
 * ✅ SEND MESSAGE ROUTE
 * Sends a text message to a specific user_id
 */
app.post('/send-message', async (req, res) => {
  const { user_id, message } = req.body;

  if (!bot) {
    return res.status(503).json({ error: 'Zalo Bot is not initialized' });
  }

  console.log('📤 Sending to:', user_id);

  if (!user_id || !message) {
    return res.status(400).json({ error: 'Missing user_id or message' });
  }

  try {
    const result = await bot.sendMessage(user_id, message);
    console.log('✅ SUCCESS:', result);
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
 * ✅ Health Check
 * Basic endpoint to verify server status
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    bot_initialized: !!bot
  });
});

// Start Server for local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🧪 Test UI: http://localhost:${PORT}`);
  });
}

module.exports = app;
