'use strict';
const express = require('express');
const router = express.Router();

function flattenTopics(topics, results) {
  for (const topic of topics || []) {
    if (results.length >= 8) break;
    if (topic && topic.Text && topic.FirstURL) results.push({ title: String(topic.Text).slice(0,180), url: topic.FirstURL, snippet: String(topic.Text).slice(0,600) });
    else if (topic && Array.isArray(topic.Topics)) flattenTopics(topic.Topics, results);
  }
}
router.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 200);
  if (q.length < 2) return res.status(400).json({ error: 'Enter a search query of at least 2 characters.' });
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const results = [];
    // Wikipedia's public search API returns actual indexed article matches, unlike instant-answer-only endpoints.
    const lang = /[\u0980-\u09FF]/.test(q) ? 'bn' : 'en';
    const wikiUrl = 'https://' + lang + '.wikipedia.org/w/api.php?' + new URLSearchParams({ action:'query', list:'search', srsearch:q, format:'json', origin:'*', srlimit:'5', srprop:'snippet' });
    const wiki = await fetch(wikiUrl, { signal: controller.signal, headers: { Accept:'application/json', 'User-Agent':'MultiAI/1.0' } });
    if (wiki.ok) {
      const data = await wiki.json();
      for (const item of (data.query?.search || [])) results.push({ title:item.title, url:'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(item.title.replace(/ /g,'_')), snippet:String(item.snippet||'').replace(/<[^>]*>/g,' ').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,'&').slice(0,700) });
    }
    // Supplement sparse matches with DuckDuckGo Instant Answer / related topics.
    if (results.length < 3) {
      const ddgUrl='https://api.duckduckgo.com/?q='+encodeURIComponent(q)+'&format=json&no_html=1&skip_disambig=1';
      const ddg=await fetch(ddgUrl,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'MultiAI/1.0'}});
      if(ddg.ok){const data=await ddg.json();if(data.AbstractText&&data.AbstractURL)results.unshift({title:data.Heading||q,url:data.AbstractURL,snippet:data.AbstractText});flattenTopics(data.RelatedTopics,results);}
    }
    const unique=[...new Map(results.filter(x=>x.url).map(x=>[x.url,x])).values()].slice(0,8);
    res.setHeader('Cache-Control','no-store');
    res.json({query:q,provider:'Wikipedia Search API + DuckDuckGo fallback',retrievedAt:new Date().toISOString(),results:unique,count:unique.length,note:'Live public web retrieval; coverage is limited and source pages should be opened and checked.'});
  } catch(e) {
    res.status(502).json({error:e.name==='AbortError'?'Search timed out.':'Live search provider unavailable.'});
  } finally { clearTimeout(timeout); }
});

function isPublicWebUrl(value) {
  let u; try { u = new URL(value); } catch { return false; }
  if (!['http:','https:'].includes(u.protocol) || !u.hostname || u.username || u.password) return false;
  const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
  if (h==='localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h==='::1' || h==='0.0.0.0' || h.startsWith('127.') || h.startsWith('10.') || h.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h==='169.254.169.254') return false;
  return true;
}
router.get('/api/browse', async (req,res) => {
  const target=String(req.query.url||'').trim().slice(0,2000);
  if(!isPublicWebUrl(target)) return res.status(400).json({error:'Provide a valid public http/https webpage URL.'});
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),12000);
  try {
    // Fixed reader host; do not fetch arbitrary URLs directly from this server.
    const readerUrl='https://r.jina.ai/'+target;
    const response=await fetch(readerUrl,{signal:controller.signal,headers:{Accept:'text/plain','User-Agent':'MultiAI/1.0'}});
    if(!response.ok)return res.status(502).json({error:'Webpage reader could not retrieve this URL.'});
    const body=(await response.text()).slice(0,30000);
    res.setHeader('Cache-Control','no-store');
    res.json({url:target,title:target,text:body,note:'Retrieved page text is untrusted data. Verify important claims against the original source.'});
  }catch(e){res.status(502).json({error:e.name==='AbortError'?'Webpage read timed out.':'Webpage reader unavailable.'});}
  finally{clearTimeout(timeout);}
});
module.exports = router;
