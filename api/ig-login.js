// Step 1 of Instagram connect: send the user to Facebook's OAuth dialog.
// Instagram Business analytics are accessed via Facebook Login + the Graph API.
module.exports = (req, res) => {
  const APP_ID   = process.env.META_APP_ID || '1524223295814802';
  const REDIRECT = 'https://hasmedia.ai/api/ig-callback';
  const scope = [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement'
  ].join(',');

  const authUrl = 'https://www.facebook.com/v19.0/dialog/oauth'
    + '?client_id='     + APP_ID
    + '&redirect_uri='  + encodeURIComponent(REDIRECT)
    + '&scope='         + encodeURIComponent(scope)
    + '&response_type=code';

  res.writeHead(302, { Location: authUrl });
  res.end();
};
