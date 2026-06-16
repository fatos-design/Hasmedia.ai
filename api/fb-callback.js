// Facebook redirects here after the client approves. We exchange the code
// (server-side, with the secret) for their basic profile, then sign them
// into the dashboard by stashing a short session in the browser.
module.exports = async (req, res) => {
  const APP_ID     = process.env.META_APP_ID || '1524223295814802';
  const APP_SECRET = process.env.META_APP_SECRET;
  const REDIRECT   = 'https://hasmedia.ai/api/fb-callback';

  const url   = new URL(req.url, 'https://hasmedia.ai');
  const code  = url.searchParams.get('code');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');

  res.setHeader('Content-Type', 'text/html');

  const fail = (title, msg) => res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · HasMedia</title>
<style>body{font-family:-apple-system,sans-serif;background:#0A0A09;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#1A1A18;border:.5px solid rgba(255,255,255,.12);border-radius:14px;padding:2.5rem;max-width:420px;text-align:center}
.muted{color:rgba(255,255,255,.55);font-size:14px;line-height:1.7}a{display:inline-block;margin-top:1.3rem;background:#E8521A;color:#fff;text-decoration:none;padding:.7rem 1.4rem;border-radius:8px;font-weight:600}</style>
</head><body><div class="card"><h2>${title}</h2><p class="muted">${msg}</p><a href="/">← Back to sign in</a></div></body></html>`);

  if (error)       return fail('Sign-in cancelled', error);
  if (!code)       return fail('Error', 'Open this from the “Continue with Facebook” button.');
  if (!APP_SECRET) return fail('Error', 'META_APP_SECRET is missing in Vercel.');

  try {
    const tok = await (await fetch('https://graph.facebook.com/v19.0/oauth/access_token'
      + '?client_id='     + APP_ID
      + '&redirect_uri='  + encodeURIComponent(REDIRECT)
      + '&client_secret=' + APP_SECRET
      + '&code='          + encodeURIComponent(code))).json();
    if (tok.error) throw new Error(tok.error.message);

    const me = await (await fetch('https://graph.facebook.com/v19.0/me?fields=name,email&access_token=' + tok.access_token)).json();
    if (me.error) throw new Error(me.error.message);

    const user = { name: me.name || 'Facebook user', email: me.email || '', provider: 'facebook' };

    // Stash a short session, then drop them into the dashboard.
    res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signing in…</title>
<style>body{font-family:-apple-system,sans-serif;background:#0A0A09;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}</style></head>
<body><p>Signing you in…</p>
<script>try{sessionStorage.setItem('hm_social', ${JSON.stringify(JSON.stringify(user))});}catch(e){}location.replace('/');</script>
</body></html>`);
  } catch (e) {
    return fail('Couldn’t sign in', e.message);
  }
};
