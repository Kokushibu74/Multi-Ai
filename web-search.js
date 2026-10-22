'use strict';
const express = require('express');
const router = express.Router();

router.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 200);
  if (q.length < 2) return res.status(400).json({ error: 'Enter a search query of at least 2 characters.' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const endpoint = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(q) + '&format=json&no_html=1&skip_disambig=1';
    const response = await fetch(endpoint, { signal: controller.signal, headers: { 'Accept': 'application/json', 'User-Agent': 'MultiAI/1.0' } });
    if (!response.ok) return res.status(502).json({ error: 'Search provider unavailable.' });
    const data = await response.json();
    const results = [];
    if (data.AbstractText && data.AbstractURL) results.push({ title: data.Heading || q, url: data.AbstractURL, snippet: data.AbstractText });
    for (const topic of (data.RelatedTopics || [])) {
      if (results.length >= 8) break;
      if (topic && topic.Text && topic.FirstURL) results.push({ title: topic.Text.slice(0, 180), url: topic.FirstURL, snippet: topic.Text });
      else for (const child of (topic.Topics || [])) {
        if (results.length >= 8) break;
        if (child.Text && child.FirstURL) results.push({ title: child.Text.slice(0, 180), url: child.FirstURL, snippet: child.Text });
      }
    }
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({ query: q, provider: 'DuckDuckGo Instant Answer', results, count: results.length, note: 'This endpoint returns public instant-answer and related-topic data, not a complete search engine index. Verify important claims at source URLs.' });
  } catch (e) {
    res.status(502).json({ error: e.name === 'AbortError' ? 'Search timed out.' : 'Web retrieval is temporarily unavailable.' });
  } finally { clearTimeout(timeout); }
});
module.exports = router;
