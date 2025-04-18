/**
 * Authentication Controller
 * 
 * Handles all authentication-related business logic including user registration,
 * login, password management, and email verification.
 * 
 * Main Functions:
 * - register: New user registration with role-based validation
 * - login: User authentication and token generation
 * - forgotPassword: Password reset request handling
 * - resetPassword: Password reset implementation
 * - verifyEmail: Email verification process
 * - updatePassword: Password update for logged-in users
 * - refreshToken: JWT token refresh functionality
 * 
 * Security Features:
 * - Password hashing using bcrypt
 * - JWT token generation and validation
 * - Rate limiting for sensitive operations
 * - Email verification workflow
 * - Password strength validation
 * 
 * Error Handling:
 * - Input validation errors
 * - Authentication failures
 * - Database operation errors
 * - Email sending failures
 * 
 * Dependencies:
 * - User model
 * - JWT for token management
 * - Email service for notifications
 * - Validation middleware
 * 
 * @type {module} Authentication controller module
 */

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        fullName: profile.displayName,
        profileImage: profile.photos[0].value,
        isEmailVerified: true,
        role: 'student' // Default role, can be updated later
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

exports.signup = async (req, res) => {
  try {
    const { fullName, email, password, role, department, yearOfStudy, studentId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }

    // Create new user
    const user = await User.create({
      fullName,
      email,
      password,
      role,
      department,
      yearOfStudy,
      studentId,
      isEmailVerified: true // Temporarily set to true
    });

    // Generate token
    const token = signToken(user._id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with that email address'
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();
    await sendPasswordResetEmail(email, resetToken);

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to email'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }

    // Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }

    // Generate token
    const token = signToken(user._id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

exports.googleCallback = (req, res) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err) {
      return res.status(401).json({
        status: 'error',
        message: err.message
      });
    }

    const token = signToken(user._id);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  })(req, res);
};

exports.protect = async (req, res, next) => {
  try {
    // Get token
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
}; 