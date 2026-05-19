const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findByGoogleId, findByEmail, linkGoogleAccount, createUser, findById } = require('../services/user.service');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

const hasGoogleConfig = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL;

if (!hasGoogleConfig) {
  console.warn('⚠️ Google OAuth no está configurado. Define GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_CALLBACK_URL en .env.');
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const name = profile.displayName || email || 'Usuario';

          let user = await findByGoogleId(googleId);
          if (!user) {
            user = email ? await findByEmail(email) : null;
            if (user) {
              user = await linkGoogleAccount(user.id, googleId);
            } else {
              const role = req.session.pendingRole || 'alumno';
              user = await createUser({ googleId, name, email, role });
            }
            delete req.session.pendingRole;
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}
