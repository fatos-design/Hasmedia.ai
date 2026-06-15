// Step 2 of Instagram connect: Facebook redirects here with a ?code=...
// We exchange it (server-side, using the secret) for a token, then pull the
// linked Instagram Business account's basic profile as proof the pipeline works.
module.exports = async (req, res) => {
  const APP_ID     = process.env.META_APP_ID || '1524223295814802';
  const APP_SECRET = process.env.META_APP_SECRET;
  const REDIRECT   = 'https://hasmedia.ai/api/ig-callback';

  const url   = new URL(req.url, 'https://hasmedia.ai');
  const code  = url.searchParams.get('code');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');

  const page = (title, body) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · HasMedia</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0A0A09;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#1A1A18;border:.5px solid rgba(255,255,255,.12);border-radius:14px;padding:2.5rem;max-width:420px;text-align:center}
h2{margin:0 0 .6rem}.muted{color:rgba(255,255,255,.55);font-size:14px;line-height:1.7}
a{display:inline-block;margin-top:1.3rem;background:#E8521A;color:#fff;text-decoration:none;padding:.7rem 1.4rem;border-radius:8px;font-weight:600;font-size:14px}</style>
</head><body><div class="card">${body}<a href="/">← Back to dashboard</a></div></body></html>`;

  res.setHeader('Content-Type', 'text/html');

  if (error)        { res.status(200).send(page('Cancelled', `<h2>Connection cancelled</h2><p class="muted">${error}</p>`)); return; }
  if (!code)        { res.status(400).send(page('Error', `<h2>Missing code</h2><p class="muted">Open this from the “Connect with Instagram” button.</p>`)); return; }
  if (!APP_SECRET)  { res.status(500).send(page('Error', `<h2>Server not configured</h2><p class="muted">META_APP_SECRET is missing in Vercel.</p>`)); return; }

  try {
    // 1) code -> user access token
    const tok = await (await fetch('https://graph.facebook.com/v19.0/oauth/access_token'
      + '?client_id='     + APP_ID
      + '&redirect_uri='  + encodeURIComponent(REDIRECT)
      + '&client_secret=' + APP_SECRET
      + '&code='          + encodeURIComponent(code))).json();
    if (tok.error) throw new Error(tok.error.message);

    // 2) the Facebook Pages this user manages
    const pages = await (await fetch('https://graph.facebook.com/v19.0/me/accounts?access_token=' + tok.access_token)).json();
    if (pages.error) throw new Error(pages.error.message);
    const fbPage = pages.data && pages.data[0];
    if (!fbPage) { res.status(200).send(page('Connected', `<h2>No Facebook Page</h2><p class="muted">Instagram analytics need a Business/Creator IG account linked to a Facebook Page. None found on this account.</p>`)); return; }

    // 3) the Instagram Business account linked to that Page
    const link = await (await fetch('https://graph.facebook.com/v19.0/' + fbPage.id + '?fields=instagram_business_account&access_token=' + fbPage.access_token)).json();
    const igId = link.instagram_business_account && link.instagram_business_account.id;
    if (!igId) { res.status(200).send(page('Connected', `<h2>No Instagram account linked</h2><p class="muted">Link an Instagram Business/Creator account to the “${fbPage.name}” Page, then try again.</p>`)); return; }

    // 4) basic profile (proof the pipeline works)
    const prof = await (await fetch('https://graph.facebook.com/v19.0/' + igId + '?fields=username,followers_count,media_count&access_token=' + fbPage.access_token)).json();
    if (prof.error) throw new Error(prof.error.message);

    res.status(200).send(page('Connected', `<h2>✅ Instagram connected!</h2>
      <p class="muted"><b>@${prof.username}</b><br>${(prof.followers_count||0).toLocaleString()} followers · ${prof.media_count||0} posts</p>
      <p class="muted">The connection works. Live analytics will flow into your dashboard next.</p>`));
  } catch (e) {
    res.status(200).send(page('Error', `<h2>Couldn’t connect</h2><p class="muted">${e.message}</p>`));
  }
};
