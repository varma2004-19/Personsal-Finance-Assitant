const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();

// In-memory storage for custom categories (in production, use database)
const userCategories = new Map();

// @route   GET /api/categories
// @desc    Get all categories (default + custom)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const customCategories = userCategories.get(userId) || { expense: [], income: [] };
    
    const defaultExpenseCategories = [
      'Food & Dining',
      'Transportation',
      'Shopping',
      'Entertainment',
      'Bills & Utilities',
      'Healthcare',
      'Education',
      'Travel',
      'Personal Care',
      'Home & Garden',
      'Insurance',
      'Taxes',
      'Business',
      'Gifts & Donations',
      'Other'
    ];

    const defaultIncomeCategories = [
      'Salary',
      'Freelance',
      'Business',
      'Investment',
      'Rental',
      'Bonus',
      'Gift',
      'Refund',
      'Other'
    ];

    res.json({
      expense: [...defaultExpenseCategories, ...customCategories.expense],
      income: [...defaultIncomeCategories, ...customCategories.income],
      custom: customCategories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
});

// @route   POST /api/categories
// @desc    Add custom category
// @access  Private
router.post('/', auth, [
  body('name', 'Category name is required').trim().isLength({ min: 1, max: 50 }),
  body('type', 'Type must be income or expense').isIn(['income', 'expense']),
  body('color', 'Color must be a valid hex color').optional().matches(/^#[0-9A-F]{6}$/i)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, color, icon } = req.body;
    const userId = req.user._id.toString();
    
    const userCats = userCategories.get(userId) || { expense: [], income: [] };
    
    // Check if category already exists
    if (userCats[type].some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const newCategory = {
      id: Date.now().toString(),
      name,
      color: color || '#007bff',
      icon: icon || 'bi-tag',
      createdAt: new Date()
    };

    userCats[type].push(newCategory);
    userCategories.set(userId, userCats);

    res.status(201).json({
      message: 'Category created successfully',
      category: newCategory
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error creating category' });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update custom category
// @access  Private
router.put('/:id', auth, [
  body('name', 'Category name is required').optional().trim().isLength({ min: 1, max: 50 }),
  body('color', 'Color must be a valid hex color').optional().matches(/^#[0-9A-F]{6}$/i)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, color, icon } = req.body;
    const categoryId = req.params.id;
    const userId = req.user._id.toString();
    
    const userCats = userCategories.get(userId) || { expense: [], income: [] };
    
    let categoryFound = false;
    let updatedCategory = null;

    // Find and update category in either expense or income
    ['expense', 'income'].forEach(type => {
      const categoryIndex = userCats[type].findIndex(cat => cat.id === categoryId);
      if (categoryIndex !== -1) {
        categoryFound = true;
        if (name) userCats[type][categoryIndex].name = name;
        if (color) userCats[type][categoryIndex].color = color;
        if (icon) userCats[type][categoryIndex].icon = icon;
        userCats[type][categoryIndex].updatedAt = new Date();
        updatedCategory = userCats[type][categoryIndex];
      }
    });

    if (!categoryFound) {
      return res.status(404).json({ message: 'Category not found' });
    }

    userCategories.set(userId, userCats);

    res.json({
      message: 'Category updated successfully',
      category: updatedCategory
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error updating category' });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete custom category
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const userId = req.user._id.toString();
    
    const userCats = userCategories.get(userId) || { expense: [], income: [] };
    
    let categoryFound = false;

    // Find and remove category from either expense or income
    ['expense', 'income'].forEach(type => {
      const categoryIndex = userCats[type].findIndex(cat => cat.id === categoryId);
      if (categoryIndex !== -1) {
        categoryFound = true;
        userCats[type].splice(categoryIndex, 1);
      }
    });

    if (!categoryFound) {
      return res.status(404).json({ message: 'Category not found' });
    }

    userCategories.set(userId, userCats);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error deleting category' });
  }
});

// @route   GET /api/categories/usage
// @desc    Get category usage statistics
// @access  Private
router.get('/usage', auth, async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    
    const categoryUsage = await Transaction.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ categoryUsage });
  } catch (error) {
    console.error('Category usage error:', error);
    res.status(500).json({ message: 'Server error fetching category usage' });
  }
});

module.exports = router;