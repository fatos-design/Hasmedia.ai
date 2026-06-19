// "Ask HasMedia" → real Claude AI.
// Receives { question, context } from the dashboard chat, asks Claude (cheap
// Haiku model) with the connected account's data as context, returns the reply.
// The frontend falls back to its built-in scripted answer if this errors.
module.exports = async (req, res) => {
  const KEY = process.env.ANTHROPIC_API_KEY;
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  if (!KEY) { res.status(200).json({ answer: null, error: 'AI not configured' }); return; }

  // Read the JSON body.
  let raw = '';
  try {
    raw = await new Promise((resolve, reject) => {
      let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); req.on('error', reject);
    });
  } catch (e) {}
  let parsed = {};
  try { parsed = JSON.parse(raw || '{}'); } catch (e) {}

  const question = (parsed.question || '').toString().slice(0, 600);
  const context  = (parsed.context  || '').toString().slice(0, 2500);
  if (!question) { res.status(400).json({ error: 'No question' }); return; }

  const system =
    'You are "Ask HasMedia", a friendly, sharp Instagram analytics assistant built by HasMedia, ' +
    'a social media marketing agency. You help the agency and their creator/business clients understand ' +
    'their Instagram performance and plan content. Be concise (2-4 sentences), warm, and practical. ' +
    'Use the account data provided below. If asked for something not in the data (exact view counts, reach, ' +
    'impressions), say those unlock with deeper analytics and answer with what you do have. ' +
    'Never invent specific numbers that are not in the data. You can chat casually too.\n\n' +
    'Account data:\n' + (context || '(no account connected yet)');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: system,
        messages: [{ role: 'user', content: question }]
      })
    });
    const data = await r.json();
    if (data.error) { res.status(200).json({ answer: null, error: data.error.message || 'AI error' }); return; }
    const text = (data.content && data.content[0] && data.content[0].text) || '';
    res.status(200).json({ answer: text });
  } catch (e) {
    res.status(200).json({ answer: null, error: e.message });
  }
};
