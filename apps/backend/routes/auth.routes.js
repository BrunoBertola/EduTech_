const express = require('express');
const passport = require('passport');
const router = express.Router();

const { logout, authCallback, authFailure, demoLogin, localRegister, localLogin } = require('../controllers/auth.controller');

function hasGoogleConfig() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL);
}

function redirectGoogleConfigError(req, res) {
  const clientUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const loginUrl = new URL('/login', clientUrl);
  loginUrl.searchParams.set('error', 'google_not_configured');
  res.redirect(loginUrl.toString());
}

function resolveBaseUrl(req) {
  const rawHost  = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const rawProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host  = rawHost.split(',')[0].trim();
  const proto = host.includes('ngrok') ? 'https' : rawProto.split(',')[0].trim();
  return `${proto}://${host}`;
}

router.get('/google', (req, res, next) => {
  if (!hasGoogleConfig()) {
    return redirectGoogleConfigError(req, res);
  }

  const role = req.query.role === 'profesor' ? 'profesor' : 'alumno';
  req.session.pendingRole = role;

  const base = resolveBaseUrl(req);
  req.session.authOrigin = base;
  const callbackURL = `${base}/auth/google/callback`;

  passport.authenticate('google', { scope: ['profile', 'email'], callbackURL })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!hasGoogleConfig()) {
    return redirectGoogleConfigError(req, res);
  }

  const base = resolveBaseUrl(req);
  const callbackURL = `${base}/auth/google/callback`;

  passport.authenticate('google', {
    failureRedirect: '/auth/failure',
    failureFlash: true,
    callbackURL,
  })(req, res, next);
}, authCallback);

router.get('/failure', authFailure);
router.post('/local/register', localRegister);
router.post('/local/login', localLogin);
router.post('/demo-login', demoLogin);
router.get('/logout', logout);

module.exports = router;
