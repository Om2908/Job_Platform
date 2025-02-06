const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const passport = require("passport");
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      const { email, name } = profile._json;
      try {
        let user = await User.findOne({ email });
        let password = 1234;
        console.log(user);
        if (!user) {
          user = new User({
            name,
            email,
             password: Math.random().toString(36).slice(-8),
            role: "job_seeker",
            provider: "google",
            googleId: profile.id
          });
          await user.save();
        }
        done(null, user);
      } catch (error) {
        done(error, false);
      }
    }
  )
);

passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/linkedin/callback",
      scope: ["openid", "email", "profile"],
    },
    async (accessToken, tokenSecret, profile, done) => {
      // console.log(profile)
      const {emailAddress: email, localizedFirstName: name } = profile._json;
      try {
        let user = await User.findOne({ email });
        if (!user) {
          user = new User({
            name,
            email,
            role: "job_seeker",
            provider: "linkedin",
            linkedinId: profile.id
          });
          await user.save();
        }
        done(null, user);
      } catch (error) {
        done(error, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async(id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
