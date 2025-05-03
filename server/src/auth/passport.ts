// server/src/auth/passport.ts
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { User, IUser } from '../models/User'; // Adjust path as necessary
import { jwtConfig } from './config';

// --- Access Token Strategy ---
const accessOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtConfig.accessSecret,
};

passport.use(
  'jwt-access',
  new JwtStrategy(accessOptions, async (payload, done) => {
    try {
      // Payload typically contains user id (sub) and potentially role, etc.
      const user = await User.findById(payload.sub).populate('role'); // Populate role info

      if (user && user.isActive) {
        // Attach user object (excluding password) and role to the request
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userForReq: any = user.toJSON(); // Use toJSON to remove sensitive fields if configured
        // Explicitly add role name if needed, assuming 'role' populated object has 'name'
        if (user.role && typeof user.role === 'object' && 'name' in user.role) {
          userForReq.roleName = user.role.name;
        }
        return done(null, userForReq);
      } else {
        return done(null, false, { message: 'User not found or inactive.' });
      }
    } catch (error) {
      console.error('Error in JWT Access Strategy:', error);
      return done(error, false);
    }
  })
);

// --- Refresh Token Strategy ---
// Note: Refresh token strategy might need request object if refresh token is in body/cookie
const refreshOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), // Assuming refresh token is sent in request body
  secretOrKey: jwtConfig.refreshSecret,
  // passReqToCallback: true, // Uncomment if you need access to the request object
};

passport.use(
  'jwt-refresh',
  new JwtStrategy(refreshOptions, async (/*req,*/ payload, done) => {
    // If using passReqToCallback: true, the first argument is 'req'
    // const refreshTokenFromBody = req.body.refreshToken; // Example if needed

    try {
      const user = await User.findById(payload.sub);

      if (user && user.isActive) {
        // Here, we just need to verify the user exists and is active.
        // The actual refresh token validation (against the Session store)
        // should happen in the route handler that uses this strategy.
        // We pass the user ID (payload.sub) and potentially the token ID (payload.jti if you include it)
        // to the route handler via the 'info' object or by attaching to user object.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const minimalUser: any = { id: user._id, email: user.email }; // Pass minimal user info
        // Optionally include the refresh token's unique ID (jti) if you generate it
        // if (payload.jti) {
        //   minimalUser.jti = payload.jti;
        // }
        return done(null, minimalUser);
      } else {
        return done(null, false, { message: 'User not found or inactive for refresh.' });
      }
    } catch (error) {
      console.error('Error in JWT Refresh Strategy:', error);
      return done(error, false);
    }
  })
);

// Export the configured passport instance (optional, depending on how you initialize)
export default passport;

// // --- Potentially needed for session-based auth (Not typically used with JWT) ---
// passport.serializeUser((user, done) => {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   done(null, (user as any).id);
// });

// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     done(null, user);
//   } catch (error) {
//     done(error, null);
//   }
// });
