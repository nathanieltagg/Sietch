"use strict";

var express = require('express');
var router = express.Router();
var passport = require('passport');
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var Auth0Strategy = require('passport-auth0');
var jsonwebtoken = require('jsonwebtoken');
var jwt = require('express-jwt');
var jwks = require('jwks-rsa');


// Perform the login, after login Auth0 will redirect to callback
router.get('/login', passport.authenticate('auth0', {
  scope: 'openid email profile',
  audience: 'https://sietch.xyz/api'
}), function (req, res) {
  res.redirect('/');
});

// Perform the final stage of authentication and redirect to previously requested URL or '/user'
router.get('/callback', function (req, res, next) {
  passport.authenticate('auth0', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.send("no user???"); /*res.redirect('/login');*/}
    req.logIn(user, function (err) {
      if (err) { return next(err); }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || '/user');
    });
  })(req, res, next);
});

// Perform session logout and redirect to homepage
router.get('/logout', (req, res) => {
  req.logout();

  // Go to '/' after logout:
  var returnTo = req.protocol + '://' + req.hostname;
  var port = req.connection.localPort;
  if (port !== undefined && port !== 80 && port !== 443) {
    returnTo += ':' + port;
  }
  returnTo = config.my_url;

  var logoutURL = new url.URL(
    util.format('https://%s/v2/logout', config.auth0_domain)
  );
  var searchString = querystring.stringify({
    client_id: config.auth0_client_id,
    returnTo: returnTo
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL);
});



module.exports = function(app) {

    // Configure Passport.

    // Configure Passport to use Auth0
    var strategy = new Auth0Strategy(
      {
        domain:       config.auth0_domain,
        clientID:     config.auth0_client_id,
        clientSecret: config.auth0_client_secret,
        callbackURL:
          config.auth0_callback_url || 'http://localhost:12313/callback'
      },
      function (accessToken, refreshToken, extraParams, profile, done) {
        // accessToken is the token to call Auth0 API (not needed in the most cases)
        // extraParams.id_token has the JSON Web Token
        // profile has all the information from the user

        // decode the access token (does not verify)
        var decoded = jsonwebtoken.decode(accessToken);
        profile.permissions = decoded.permissions;
        console.log(decoded,profile);
        // console.log("auth0 strategy callback",...arguments);
        return done(null, profile);
      }
    );
    passport.use(strategy);
    app.use(passport.initialize());
    app.use(passport.session());

    // You can use this section to keep a smaller payload
    passport.serializeUser(function (user, done) {
      console.log('serializeUser',user);
      done(null, user);
    });

    passport.deserializeUser(function (user, done) {
      done(null, user);
    });


    // Machine-to-machine authentication
    var jwtCheck = jwt({
      secret: jwks.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: 'https://' + config.auth0_domain + '/.well-known/jwks.json'
    }),
    audience: 'https://sietch.xyz/api',
    issuer: 'https://' + config.auth0_domain + '/',
    algorithms: ['RS256'],
    credentialsRequired: false,
    });

    app.use('/api',jwtCheck);


    app.use(function (req, res, next) {
        // If the user is from a jwt token, add more information...
        // FIXME
        
        // make the req.user object available to the pug templates! Cool!
        res.locals.user = req.user;
        next();
    });

 

    // authentication routes
    app.use('/',router);
};