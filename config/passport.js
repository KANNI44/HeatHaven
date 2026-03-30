const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

passport.use(
  (() => {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
      console.warn(
        'Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL in .env.'
      );
      return null;
    }

    return new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value;
          if (!email) return done(null, false);

          const name =
            profile?.displayName ||
            [profile?.name?.givenName, profile?.name?.familyName]
              .filter(Boolean)
              .join(' ') ||
            (email.split('@')[0] || 'Google User');

          const avatar = profile?.photos?.[0]?.value || null;
          const normalizedEmail = String(email).toLowerCase().trim();

          let user = await User.findOne({ email: normalizedEmail });
          if (user) {
            // Link existing account to Google details (keep existing passwordHash).
            user.name = name;
            user.avatar = avatar;
            await user.save();
            return done(null, user);
          }

          // For new Google users, satisfy the `passwordHash` required field.
          user = await User.create({
            name,
            email: normalizedEmail,
            avatar,
            passwordHash: crypto.randomBytes(32).toString('hex'),
            phone: null,
            role: 'user',
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    );
  })() || {
    // Dummy strategy placeholder to keep `passport.use` from crashing.
    // Real OAuth will only work when env vars are set.
    name: 'google',
    authenticate: (_req, _options, next) => next(new Error('Google OAuth not configured')),
  }
);

// We only use JWT for API auth; no need for passport sessions beyond OAuth handshake.
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = { signToken };

