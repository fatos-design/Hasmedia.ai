// "Continue with Instagram" → step 1.
// Uses the NEW "Instagram API with Instagram Login" (no Facebook Page needed).
// Sends the client straight to Instagram's own OAuth dialog with the
// instagram_business_* scopes. Instagram redirects back to /api/ig-callback
// with a one-time ?code= that we exchange server-side for a token.
module.exports = (req, res) => {
  const IG_APP_ID = process.env.IG_APP_ID || '1518274316421742';
  const REDIRECT  = 'https://hasmedia.ai/api/ig-callback';
  const SCOPE     = 'instagram_business_basic,instagram_business_manage_insights';

  const authUrl = 'https://www.instagram.com/oauth/authorize'
    + '?client_id='     + IG_APP_ID
    + '&redirect_uri='  + encodeURIComponent(REDIRECT)
    + '&response_type=code'
    + '&scope='         + encodeURIComponent(SCOPE);

  res.writeHead(302, { Location: authUrl });
  res.end();
};
