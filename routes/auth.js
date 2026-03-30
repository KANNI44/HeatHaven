const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const passport = require('passport');
const jwt = require('jsonwebtoken');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function isGoogleOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CALLBACK_URL
  );
}

function redirectHtmlForLoggedInUser(user, token) {
  const safeUser = {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  // Store tokens for existing frontend that uses `localStorage.hh_token`.
  return `<!doctype html>
  <html>
    <head><meta charset="utf-8" /></head>
    <body>
      <script>
        localStorage.setItem('hh_token', ${JSON.stringify(token)});
        localStorage.setItem('hh_user', JSON.stringify(${JSON.stringify(safeUser)}));
        window.location.href = '/profile.html';
      </script>
    </body>
  </html>`;
}

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get(
  '/google',
  (req, res, next) => {
    if (!isGoogleOAuthConfigured()) {
      return res.status(500).send('Google OAuth not configured. Set GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL in .env.');
    }
    return passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })(req, res, next);
  }
);
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!isGoogleOAuthConfigured()) {
      return res.status(500).send('Google OAuth not configured. Set GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL in .env.');
    }
    return passport.authenticate('google', { failureRedirect: '/profile login.html', session: false })(req, res, next);
  },
  (req, res) => {
    const user = req.user;
    if (!user) return res.redirect('/profile login.html');
    const token = signToken(user._id);
    return res.send(redirectHtmlForLoggedInUser(user, token));
  }
);
router.get('/me', protect, ctrl.me);
router.put('/profile', protect, ctrl.updateProfile);
router.put('/change-password', protect, ctrl.changePassword);

module.exports = router;

