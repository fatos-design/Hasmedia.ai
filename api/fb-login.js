// "Continue with Facebook" → send the client to Facebook's login.
// Uses basic profile + email (standard access — works in Development mode now,
// and for everyone once the app is Live).
module.exports = (req, res) => {
  const APP_ID   = process.env.META_APP_ID || '1524223295814802';
  const REDIRECT = 'https://hasmedia.ai/api/fb-callback';
  const url = 'https://www.facebook.com/v19.0/dialog/oauth'
    + '?client_id='     + APP_ID
    + '&redirect_uri='  + encodeURIComponent(REDIRECT)
    + '&scope='         + encodeURIComponent('public_profile')
    + '&response_type=code';
  res.writeHead(302, { Location: url });
  res.end();
};
