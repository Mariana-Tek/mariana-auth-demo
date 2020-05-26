const express = require('express');
const nunjucks = require('nunjucks');
const simpleOauth = require('simple-oauth2');
const path = require('path');
const app = express();

const authHost = process.env.AUTH_HOST;
const baseURL = process.env.BASE_URL || '';
const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const port = process.env.PORT || 7000;

// make sure all the required environment variables are set
if (!authHost) { console.error('Error: $AUTH_HOST must be set.'); process.exit(1); }
if (!clientID) { console.error('Error: $CLIENT_ID must be set.'); process.exit(1); }
if (!clientSecret) { console.error('Error: $CLIENT_SECRET must be set.'); process.exit(1); }


// We use nunjucks for server-side templating, feel free to replace this with your solution.
nunjucks.configure(path.join(__dirname, 'templates'), {
  autoescape: true,
  cache: false,
  express: app
});

app.use(express.static(path.join(__dirname, 'public')));


// We're using simple-oauth2 to handle the authentication process, but any oauth solution should work here.
const oauth2 = simpleOauth.create({
  client: {
    id: process.env.CLIENT_ID,
    secret: process.env.CLIENT_SECRET,
  },
  auth: {
    tokenHost: process.env.AUTH_HOST,
    tokenPath: '/o/token',
    authorizePath: '/o/authorize',
  },
});


/**
 * This is the home page for the demo app.
 */
app.get('/', (req, res) => {
  res.render('index.html.njk');
});


/**
 * This is the first step in the authorization code grant flow.  Users should be redirected to the 
 * authorization window so that they can log in and give consent to use this application if necessary.
 */
app.get('/auth', (req, res) => {
  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: `${baseURL}/callback`,
    scope: 'read:account',
    prompt: true,
    // these are only required if using PKCE
    code_challenge: 'coolcode',
    code_challenge_method: 'plain',
  });
  res.redirect(authorizationUri);
});


/**
 * This is the second step in the authorization code grant flow.  After completing authorization,
 * users should be redirected to this callback, with the authorization code as a query parameter.  
 * The code should then be exchanged for an access token that can be used to authorize subsequent
 * requests.
 */
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  const options = {
    code,
    redirect_uri: `${baseURL}/callback`,
    //these are only required if using PKCE
    client_id: process.env.CLIENT_ID,
    code_verifier: 'coolcode',
  };

  if (!code) {
    return res.status(500).json('Authentication failed');
  }

  try {
    const result = await oauth2.authorizationCode.getToken(options);
    // this token can now be used to authorize requests for the authenticated user
    const token = oauth2.accessToken.create(result);
    res.redirect('/success');
  } catch (error) {
    console.log(error);
    return res.status(500).json(`Authentication failure, could not get access token: ${error.data.payload.error}}`);
  }
});


app.get('/success', async (req, res) => {
  res.render('success.html.njk');
});


app.listen(port, () => console.log(`Example app listening on http://localhost:${port}`));
