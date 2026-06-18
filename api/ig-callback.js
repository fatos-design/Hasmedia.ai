// Step 2 of Instagram connect (NEW Instagram Login API).
// Instagram redirects here with a ?code=. We exchange it server-side (using the
// Instagram app secret) for a short-lived token, upgrade it to a long-lived one,
// then pull the account's basic profile + follower count straight from
// graph.instagram.com — no Facebook Page required.
module.exports = async (req, res) => {
  const IG_APP_ID  = process.env.IG_APP_ID || '1518274316421742';
  const IG_SECRET  = process.env.IG_APP_SECRET;
  const REDIRECT   = 'https://hasmedia.ai/api/ig-callback';

  const url   = new URL(req.url, 'https://hasmedia.ai');
  // Instagram sometimes appends "#_" to the code — strip it defensively.
  let code    = url.searchParams.get('code');
  if (code) code = code.replace(/#_$/, '');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');

  const page = (title, body, extra = '') => `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · HasMedia</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0A0A09;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#1A1A18;border:.5px solid rgba(255,255,255,.12);border-radius:14px;padding:2.5rem;max-width:420px;text-align:center}
h2{margin:0 0 .6rem}.muted{color:rgba(255,255,255,.55);font-size:14px;line-height:1.7}
a{display:inline-block;margin-top:1.3rem;background:#E8521A;color:#fff;text-decoration:none;padding:.7rem 1.4rem;border-radius:8px;font-weight:600;font-size:14px}</style>
</head><body><div class="card">${body}<a href="/">← Back to dashboard</a></div>${extra}</body></html>`;

  res.setHeader('Content-Type', 'text/html');

  if (error)      { res.status(200).send(page('Cancelled', `<h2>Connection cancelled</h2><p class="muted">${error}</p>`)); return; }
  if (!code)      { res.status(400).send(page('Error', `<h2>Missing code</h2><p class="muted">Open this from the “Continue with Instagram” button.</p>`)); return; }
  if (!IG_SECRET) { res.status(500).send(page('Error', `<h2>Server not configured</h2><p class="muted">IG_APP_SECRET is missing in Vercel.</p>`)); return; }

  try {
    // 1) code -> short-lived token (form-encoded POST to api.instagram.com)
    const form = new URLSearchParams();
    form.append('client_id', IG_APP_ID);
    form.append('client_secret', IG_SECRET);
    form.append('grant_type', 'authorization_code');
    form.append('redirect_uri', REDIRECT);
    form.append('code', code);

    const tok = await (await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    })).json();
    if (tok.error_message || tok.error || tok.error_type) {
      throw new Error(tok.error_message || tok.error_type || tok.error);
    }
    const shortToken = tok.access_token;
    if (!shortToken) throw new Error('No access token returned.');

    // 2) short-lived -> long-lived token (60 days)
    const ll = await (await fetch('https://graph.instagram.com/access_token'
      + '?grant_type=ig_exchange_token'
      + '&client_secret=' + IG_SECRET
      + '&access_token='  + shortToken)).json();
    const token = ll.access_token || shortToken;

    // 3) basic profile straight from graph.instagram.com
    const prof = await (await fetch('https://graph.instagram.com/me'
      + '?fields=user_id,username,account_type,followers_count,media_count'
      + '&access_token=' + token)).json();
    if (prof.error) throw new Error(prof.error.message);

    // 4) recent posts (best-effort — don't fail the login if this errors)
    let posts = [];
    try {
      const med = await (await fetch('https://graph.instagram.com/me/media'
        + '?fields=id,caption,media_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count'
        + '&limit=6&access_token=' + token)).json();
      if (med && Array.isArray(med.data)) {
        posts = med.data.map(m => ({
          caption:  (m.caption || '').replace(/\s+/g, ' ').trim().slice(0, 70),
          type:     m.media_type || 'POST',
          permalink: m.permalink || '',
          timestamp: m.timestamp || '',
          likes:    m.like_count || 0,
          comments: m.comments_count || 0
        }));
      }
    } catch (e) { /* posts stay empty */ }

    const user = {
      name:      prof.username ? '@' + prof.username : 'Instagram user',
      username:  prof.username || '',
      followers: prof.followers_count || 0,
      media:     prof.media_count || 0,
      posts:     posts,
      provider:  'instagram'
    };

    // Sign them into the dashboard (same session mechanism as Facebook login).
    const signin = `<script>try{sessionStorage.setItem('hm_social', ${JSON.stringify(JSON.stringify(user))});}catch(e){}setTimeout(function(){location.replace('/');},1400);</script>`;
    res.status(200).send(page('Connected',
      `<h2>✅ Instagram connected!</h2>
       <p class="muted"><b>@${user.username}</b><br>${(user.followers).toLocaleString()} followers · ${user.media} posts</p>
       <p class="muted">Signing you into your dashboard…</p>`, signin));
  } catch (e) {
    res.status(200).send(page('Error', `<h2>Couldn’t connect</h2><p class="muted">${e.message}</p>`));
  }
};
