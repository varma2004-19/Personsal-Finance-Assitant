const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['income', 'expense'],
    lowercase: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'check', 'other'],
    default: 'cash'
  },
  tags: [{
    type: String,
    trim: true
  }],
  location: {
    type: String,
    trim: true
  },
  receiptUrl: {
    type: String
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: function() {
      return this.isRecurring;
    }
  },
  recurringEndDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update the updatedAt field
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, category: 1 });

// Virtual for formatted date
transactionSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString();
});

// Static method to get expense categories
transactionSchema.statics.getExpenseCategories = function() {
  return [
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
};

// Static method to get income categories
transactionSchema.statics.getIncomeCategories = function() {
  return [
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
};

module.exports = mongoose.model('Transaction', transactionSchema);