// Step 1 of Instagram connect: send the user to Facebook's OAuth dialog.
// Uses the Facebook Login for Business configuration (config_id). The config
// currently grants pages_show_list; Instagram insight permissions get added to
// the config after Meta business verification + App Review.
module.exports = (req, res) => {
  const APP_ID   = process.env.META_APP_ID || '1524223295814802';
  const CONFIG   = process.env.META_CONFIG_ID || '2098011074395484';
  const REDIRECT = 'https://hasmedia.ai/api/ig-callback';

  const authUrl = 'https://www.facebook.com/v19.0/dialog/oauth'
    + '?client_id='     + APP_ID
    + '&config_id='     + CONFIG
    + '&redirect_uri='  + encodeURIComponent(REDIRECT)
    + '&response_type=code';

  res.writeHead(302, { Location: authUrl });
  res.end();
};
