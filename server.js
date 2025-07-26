const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { kv } = require('@vercel/kv');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;

// Google AI API key from environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  return res.status(500).json({ error: "Missing Gemini API key" });
}

// List of cabang branches
const CABANGS = [
  "KEPONG", "BATU", "WANGSA MAJU", "SEGAMBUT", "SETIAWANGSA", "TITIWANGSA",
  "BUKIT BINTANG", "LEMBAH PANTAI", "SEPUTEH", "CHERAS", "BANDAR TUN RAZAK", "PUTRAJAYA", "LABUAN"
];

// Helper: Call Google AI API (pseudo, replace with your actual call)
async function generateContent(articleUrl, stance, cabang) {
  // TODO: Replace with actual Google AI API call
  return {
    facebook: `FB post for ${cabang} (${stance}) about ${articleUrl}`,
    tweet: `Tweet for ${cabang} (${stance}) about ${articleUrl}`
  };
}

app.post('/generate', async (req, res) => {
  const { articleUrl, stance } = req.body;
  if (!articleUrl || !stance) {
    return res.status(400).json({ error: 'Missing articleUrl or stance' });
  }

  try {
    const results = [];
    for (const cabang of CABANGS) {
      // Call your AI function here
      const content = await generateContent(articleUrl, stance, cabang);
      results.push({ cabang, ...content });
    }

    // Store in Vercel KV (optional, for history)
    await kv.set(`news:${Date.now()}`, { articleUrl, stance, results });

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('News Generator Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
