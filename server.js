const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { kv } = require('@vercel/kv');

// If using Node 18+ on Vercel, fetch is built-in. If not, uncomment the next line:
// const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;

// List of cabang branches
const CABANGS = [
  "KEPONG", "BATU", "WANGSA MAJU", "SEGAMBUT", "SETIAWANGSA", "TITIWANGSA",
  "BUKIT BINTANG", "LEMBAH PANTAI", "SEPUTEH", "CHERAS", "BANDAR TUN RAZAK", "PUTRAJAYA", "LABUAN"
];

// Gemini integration
async function generateContent(articleUrl, stance, cabang) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("Missing Gemini API key");

  const GEMINI_MODEL = "gemini-1.5-pro"; // or "gemini-1.5-flash"

  const prompt = `Write a Facebook post and a Tweet for the ${cabang} branch, stance: ${stance}, about this article: ${articleUrl}.
Format your response as:
Facebook: <your facebook post>
Tweet: <your tweet>`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "Gemini API error");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
  const facebook = text.match(/Facebook:(.*)/i)?.[1]?.trim() || text;
  const tweet = text.match(/Tweet:(.*)/i)?.[1]?.trim() || text;
  return { facebook, tweet };
}


app.post('/generate', async (req, res) => {
  const { articleUrl, stance } = req.body;
  if (!articleUrl || !stance) {
    return res.status(400).json({ error: 'Missing articleUrl or stance' });
  }

  try {
    const results = [];
    for (const cabang of CABANGS) {
      // Call Gemini for each cabang
      const content = await generateContent(articleUrl, stance, cabang);
      results.push({ cabang, ...content });
    }

    // Store in Vercel KV (optional, for history)
    await kv.set(`news:${Date.now()}`, { articleUrl, stance, results });

    res.json({ results });
  } catch (err) {
    console.error("Error in /generate:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('News Generator Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
