const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/transactions
// @desc    Create a new transaction
// @access  Private
router.post('/', auth, [
  body('type', 'Type is required').isIn(['income', 'expense']),
  body('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
  body('category', 'Category is required').trim().isLength({ min: 1 }),
  body('description', 'Description is required').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transactionData = {
      ...req.body,
      user: req.user._id
    };

    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Populate user data for response
    await transaction.populate('user', 'name email');

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error creating transaction' });
  }
});

// @route   GET /api/transactions
// @desc    Get all transactions for user with filtering
// @access  Private
router.get('/', auth, [
  query('page', 'Page must be a positive integer').optional().isInt({ min: 1 }),
  query('limit', 'Limit must be between 1 and 100').optional().isInt({ min: 1, max: 100 }),
  query('type', 'Type must be income or expense').optional().isIn(['income', 'expense']),
  query('category', 'Category must be a string').optional().isString(),
  query('startDate', 'Start date must be a valid date').optional().isISO8601(),
  query('endDate', 'End date must be a valid date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 10,
      type,
      category,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { user: req.user._id };
    
    if (type) filter.type = type;
    if (category) filter.category = { $regex: category, $options: 'i' };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const transactions = await Transaction.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name email');

    const total = await Transaction.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('user', 'name email');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.status(500).json({ message: 'Server error fetching transaction' });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private
router.put('/:id', auth, [
  body('type', 'Type must be income or expense').optional().isIn(['income', 'expense']),
  body('amount', 'Amount must be a positive number').optional().isFloat({ min: 0.01 }),
  body('category', 'Category is required').optional().trim().isLength({ min: 1 }),
  body('description', 'Description is required').optional().trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        transaction[key] = req.body[key];
      }
    });

    await transaction.save();
    await transaction.populate('user', 'name email');

    res.json({
      message: 'Transaction updated successfully',
      transaction
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.status(500).json({ message: 'Server error updating transaction' });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.status(500).json({ message: 'Server error deleting transaction' });
  }
});

// @route   GET /api/transactions/analytics/summary
// @desc    Get transaction summary and analytics
// @access  Private
router.get('/analytics/summary', auth, [
  query('startDate', 'Start date must be a valid date').optional().isISO8601(),
  query('endDate', 'End date must be a valid date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = { user: req.user._id };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    // Get total income and expenses
    const [incomeTotal, expenseTotal] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...dateFilter, type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { ...dateFilter, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // Get expenses by category
    const expensesByCategory = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    // Get income by category
    const incomeByCategory = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'income' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    // Get monthly trends
    const monthlyTrends = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Recent transactions
    const recentTransactions = await Transaction.find(dateFilter)
      .sort({ date: -1 })
      .limit(5)
      .populate('user', 'name email');

    const totalIncome = incomeTotal[0]?.total || 0;
    const totalExpenses = expenseTotal[0]?.total || 0;
    const netIncome = totalIncome - totalExpenses;

    res.json({
      summary: {
        totalIncome,
        totalExpenses,
        netIncome,
        savingsRate: totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(2) : 0
      },
      expensesByCategory,
      incomeByCategory,
      monthlyTrends,
      recentTransactions
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// @route   GET /api/transactions/categories
// @desc    Get available categories
// @access  Private
router.get('/categories', auth, async (req, res) => {
  try {
    const expenseCategories = Transaction.getExpenseCategories();
    const incomeCategories = Transaction.getIncomeCategories();

    res.json({
      expense: expenseCategories,
      income: incomeCategories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
});

// @route   POST /api/transactions/bulk
// @desc    Create multiple transactions
// @access  Private
router.post('/bulk', auth, [
  body('transactions', 'Transactions array is required').isArray({ min: 1 }),
  body('transactions.*.type', 'Type is required').isIn(['income', 'expense']),
  body('transactions.*.amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
  body('transactions.*.category', 'Category is required').trim().isLength({ min: 1 }),
  body('transactions.*.description', 'Description is required').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactions } = req.body;
    
    // Add user ID to each transaction
    const transactionsWithUser = transactions.map(transaction => ({
      ...transaction,
      user: req.user._id
    }));

    const createdTransactions = await Transaction.insertMany(transactionsWithUser);
    
    res.status(201).json({
      message: `${createdTransactions.length} transactions created successfully`,
      transactions: createdTransactions
    });
  } catch (error) {
    console.error('Bulk create transactions error:', error);
    res.status(500).json({ message: 'Server error creating transactions' });
  }
});

// @route   DELETE /api/transactions/bulk
// @desc    Delete multiple transactions
// @access  Private
router.delete('/bulk', auth, [
  body('transactionIds', 'Transaction IDs array is required').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionIds } = req.body;
    
    const result = await Transaction.deleteMany({
      _id: { $in: transactionIds },
      user: req.user._id
    });

    res.json({
      message: `${result.deletedCount} transactions deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete transactions error:', error);
    res.status(500).json({ message: 'Server error deleting transactions' });
  }
});

// @route   PUT /api/transactions/bulk
// @desc    Update multiple transactions
// @access  Private
router.put('/bulk', auth, [
  body('updates', 'Updates array is required').isArray({ min: 1 }),
  body('updates.*.id', 'Transaction ID is required').exists(),
  body('updates.*.data', 'Update data is required').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { updates } = req.body;
    const updatePromises = updates.map(update => 
      Transaction.findOneAndUpdate(
        { _id: update.id, user: req.user._id },
        update.data,
        { new: true }
      )
    );

    const updatedTransactions = await Promise.all(updatePromises);
    
    res.json({
      message: `${updatedTransactions.filter(t => t).length} transactions updated successfully`,
      transactions: updatedTransactions.filter(t => t)
    });
  } catch (error) {
    console.error('Bulk update transactions error:', error);
    res.status(500).json({ message: 'Server error updating transactions' });
  }
});

// @route   GET /api/transactions/analytics/yearly
// @desc    Get yearly transaction analytics
// @access  Private
router.get('/analytics/yearly', auth, [
  query('year', 'Year must be a valid number').optional().isInt({ min: 2000, max: 2100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    const yearlyData = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.month': 1 }
      }
    ]);

    // Format data for frontend consumption
    const monthlyData = {};
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = { income: 0, expense: 0 };
    }

    yearlyData.forEach(item => {
      monthlyData[item._id.month][item._id.type] = item.total;
    });

    res.json({
      year,
      monthlyData,
      rawData: yearlyData
    });
  } catch (error) {
    console.error('Yearly analytics error:', error);
    res.status(500).json({ message: 'Server error fetching yearly analytics' });
  }
});

// @route   GET /api/transactions/analytics/category-trends
// @desc    Get category spending trends
// @access  Private
router.get('/analytics/category-trends', auth, [
  query('months', 'Months must be a positive integer').optional().isInt({ min: 1, max: 24 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const months = parseInt(req.query.months) || 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const categoryTrends = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate },
          type: 'expense'
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({ categoryTrends });
  } catch (error) {
    console.error('Category trends error:', error);
    res.status(500).json({ message: 'Server error fetching category trends' });
  }
});

// @route   GET /api/transactions/search
// @desc    Search transactions
// @access  Private
router.get('/search', auth, [
  query('q', 'Search query is required').notEmpty(),
  query('page', 'Page must be a positive integer').optional().isInt({ min: 1 }),
  query('limit', 'Limit must be between 1 and 100').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q, page = 1, limit = 10 } = req.query;
    
    const searchFilter = {
      user: req.user._id,
      $or: [
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    };

    const transactions = await Transaction.find(searchFilter)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name email');

    const total = await Transaction.countDocuments(searchFilter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      query: q
    });
  } catch (error) {
    console.error('Search transactions error:', error);
    res.status(500).json({ message: 'Server error searching transactions' });
  }
});

module.exports = router;