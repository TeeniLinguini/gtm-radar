// Flank server
// Serves the static app and proxies requests to the Anthropic API so the
// API key never has to live in the browser.

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_VERSION = '2023-06-01';

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// The frontend calls this instead of api.anthropic.com directly.
// Same request body Claude's Messages API expects (model, max_tokens,
// system, messages, tools) goes straight through; only the auth headers
// are added here, server side.
app.post('/api/messages', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Server is missing ANTHROPIC_API_KEY. Set it in your Railway service variables and redeploy.'
    });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify(req.body)
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy request failed: ' + err.message });
  }
});

// Simple health check Railway (or you) can hit to confirm the service is up.
app.get('/health', (req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(ANTHROPIC_API_KEY) });
});

app.listen(PORT, () => {
  console.log(`Flank is running on port ${PORT}`);
  if (!ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is not set. Assess, Force Rescan, and Newsfeed will fail until it is.');
  }
});
