const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction'); // Added missing import

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('name', 'Name is required').trim().isLength({ min: 1 }),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, currency, monthlyBudget } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      currency: currency || 'USD',
      monthlyBudget: monthlyBudget || 0
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudget: user.monthlyBudget
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudget: user.monthlyBudget,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        currency: req.user.currency,
        monthlyBudget: req.user.monthlyBudget,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('name', 'Name is required').optional().trim().isLength({ min: 1 }),
  body('currency', 'Invalid currency').optional().isIn(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR']),
  body('monthlyBudget', 'Monthly budget must be a positive number').optional().isNumeric({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, currency, monthlyBudget } = req.body;
    const user = req.user;

    // Update fields if provided
    if (name) user.name = name;
    if (currency) user.currency = currency;
    if (monthlyBudget !== undefined) user.monthlyBudget = monthlyBudget;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudget: user.monthlyBudget
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, [
  body('currentPassword', 'Current password is required').exists(),
  body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error during password change' });
  }
});

// @route   PUT /api/auth/profile-picture
// @desc    Update profile picture
// @access  Private
router.put('/profile-picture', auth, async (req, res) => {
  try {
    const { profilePicture } = req.body;
    const user = req.user;

    user.profilePicture = profilePicture;
    await user.save();

    res.json({
      message: 'Profile picture updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudget: user.monthlyBudget,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Profile picture update error:', error);
    res.status(500).json({ message: 'Server error during profile picture update' });
  }
});

// @route   DELETE /api/auth/account
// @desc    Delete user account
// @access  Private
router.delete('/account', auth, [
  body('password', 'Password is required for account deletion').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;
    const user = req.user;

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password is incorrect' });
    }

    // Delete all user transactions first
    await Transaction.deleteMany({ user: user._id });

    // Delete user account
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ message: 'Server error during account deletion' });
  }
});

// @route   GET /api/auth/stats
// @desc    Get user account statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [transactionCount, totalIncome, totalExpenses] = await Promise.all([
      Transaction.countDocuments({ user: userId }),
      Transaction.aggregate([
        { $match: { user: userId, type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { user: userId, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      transactionCount,
      totalIncome: totalIncome[0]?.total || 0,
      totalExpenses: totalExpenses[0]?.total || 0,
      memberSince: req.user.createdAt,
      lastLogin: req.user.lastLogin
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ message: 'Server error fetching user statistics' });
  }
});

module.exports = router;