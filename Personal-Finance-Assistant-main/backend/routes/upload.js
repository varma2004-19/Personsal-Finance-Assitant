const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const pdf = require('pdf-parse');
const csv = require('csv-parser');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images, PDFs, and CSV files
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported. Please use JPG, PNG, PDF, or CSV files.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Helper function to extract receipt data using OCR
const extractReceiptData = async (imagePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log(m)
    });

    // Parse the OCR text to extract relevant information
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let total = 0;
    let merchantName = '';
    let date = new Date();
    let items = [];

    // Look for total amount (various patterns)
    const totalPatterns = [
      /total[:\s]*\$?([0-9]+\.?[0-9]*)/i,
      /amount[:\s]*\$?([0-9]+\.?[0-9]*)/i,
      /\$([0-9]+\.?[0-9]*)\s*total/i,
      /\$([0-9]+\.[0-9]{2})/g,
      /grand\s*total[:\s]*\$?([0-9]+\.?[0-9]*)/i,
      /final\s*total[:\s]*\$?([0-9]+\.?[0-9]*)/i
    ];

    for (const line of lines) {
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1]);
          if (amount > total) {
            total = amount;
          }
        }
      }
    }

    // Extract merchant name (usually at the top)
    if (lines.length > 0) {
      merchantName = lines[0].substring(0, 50); // First line, limited length
    }

    // Look for date patterns
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{1,2}-\d{1,2}-\d{4})/,
      /(\d{4}-\d{1,2}-\d{1,2})/,
      /(\d{1,2}\/\d{1,2}\/\d{2})/,
      /(\d{1,2}-\d{1,2}-\d{2})/
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          const parsedDate = new Date(match[1]);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate;
            break;
          }
        }
      }
    }

    // Extract individual items (basic implementation)
    for (const line of lines) {
      const itemMatch = line.match(/(.+?)\s+\$?([0-9]+\.?[0-9]*)/);
      if (itemMatch && parseFloat(itemMatch[2]) > 0) {
        items.push({
          name: itemMatch[1].trim(),
          amount: parseFloat(itemMatch[2])
        });
      }
    }

    // Determine category based on merchant name
    const category = determineCategory(merchantName);

    return {
      total,
      merchantName,
      date: isNaN(date.getTime()) ? new Date() : date,
      items,
      category,
      rawText: text
    };
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract data from receipt');
  }
};

// Helper function to determine category based on merchant name or description
const determineCategory = (merchantName) => {
  const name = merchantName.toLowerCase();
  
  if (name.includes('grocery') || name.includes('food') || name.includes('supermarket') || name.includes('market')) {
    return 'Food & Dining';
  } else if (name.includes('gas') || name.includes('fuel') || name.includes('shell') || name.includes('exxon')) {
    return 'Transportation';
  } else if (name.includes('amazon') || name.includes('walmart') || name.includes('target') || name.includes('costco')) {
    return 'Shopping';
  } else if (name.includes('restaurant') || name.includes('cafe') || name.includes('pizza') || name.includes('burger')) {
    return 'Food & Dining';
  } else if (name.includes('uber') || name.includes('lyft') || name.includes('taxi')) {
    return 'Transportation';
  } else if (name.includes('netflix') || name.includes('spotify') || name.includes('hulu') || name.includes('amazon prime')) {
    return 'Entertainment';
  } else if (name.includes('gym') || name.includes('fitness') || name.includes('planet fitness')) {
    return 'Health & Fitness';
  } else {
    return 'Other';
  }
};

// Improved helper function to parse CSV files
const parseCSVFile = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv({
        skipEmptyLines: true,
        headers: true,
        mapHeaders: ({ header }) => header.trim().toLowerCase()
      }))
      .on('data', (data) => {
        try {
          // Clean and normalize the data keys
          const cleanData = {};
          Object.keys(data).forEach(key => {
            cleanData[key.trim().toLowerCase()] = data[key];
          });

          // Handle different column name variations
          const dateField = cleanData.date || cleanData.transaction_date || cleanData.transactiondate;
          const descriptionField = cleanData.description || cleanData.memo || cleanData.note || cleanData.merchant;
          const amountField = cleanData.amount || cleanData.transaction_amount || cleanData.transactionamount;
          const categoryField = cleanData.category || cleanData.transaction_category || cleanData.transactioncategory;
          
          if (dateField && descriptionField && amountField) {
            // Parse date
            let parsedDate = new Date(dateField);
            if (isNaN(parsedDate.getTime())) {
              // Try alternative date formats
              const dateFormats = [
                /(\d{4}-\d{1,2}-\d{1,2})/,
                /(\d{1,2}\/\d{1,2}\/\d{4})/,
                /(\d{1,2}-\d{1,2}-\d{4})/
              ];
              
              for (const format of dateFormats) {
                const match = dateField.match(format);
                if (match) {
                  parsedDate = new Date(match[1]);
                  if (!isNaN(parsedDate.getTime())) break;
                }
              }
            }

            // Parse amount (handle different formats and remove currency symbols)
            let amount = parseFloat(String(amountField).replace(/[$,₹]/g, ''));
            
            // Determine if it's income or expense
            const isIncome = amount > 0 || 
                            String(descriptionField).toLowerCase().includes('deposit') ||
                            String(descriptionField).toLowerCase().includes('salary') ||
                            String(descriptionField).toLowerCase().includes('payment received') ||
                            String(descriptionField).toLowerCase().includes('credit') ||
                            String(descriptionField).toLowerCase().includes('refund');
            
            // Use absolute value for amount
            amount = Math.abs(amount);
            
            // Determine category
            let category = categoryField || (isIncome ? 'Income' : 'Other');
            if (!categoryField && !isIncome) {
              category = determineCategory(String(descriptionField));
            }

            const normalizedData = {
              date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
              description: String(descriptionField).trim(),
              amount: amount,
              type: isIncome ? 'income' : 'expense',
              category: category,
              paymentMethod: 'bank_transfer'
            };
            
            // Only add if we have valid data
            if (normalizedData.amount > 0 && normalizedData.description.length > 0) {
              results.push(normalizedData);
            }
          }
        } catch (error) {
          console.error('Error processing CSV row:', error, data);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Helper function to parse PDF transaction history
const parsePDFTransactions = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);
    
    const lines = pdfData.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const transactions = [];

    // Basic parsing for tabular transaction data
    for (const line of lines) {
      // Look for lines that might contain transaction data
      const transactionPatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([+-]?\$?₹?[0-9,]+\.?[0-9]*)/,
        /(\d{1,2}-\d{1,2}-\d{4})\s+(.+?)\s+([+-]?\$?₹?[0-9,]+\.?[0-9]*)/,
        /(\d{4}-\d{1,2}-\d{1,2})\s+(.+?)\s+([+-]?\$?₹?[0-9,]+\.?[0-9]*)/
      ];

      for (const pattern of transactionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const date = new Date(match[1]);
          const description = match[2].trim();
          const amountStr = match[3].replace(/[$,₹]/g, '');
          const amount = Math.abs(parseFloat(amountStr));

          if (!isNaN(date.getTime()) && amount > 0 && description.length > 0) {
            // Determine if it's income or expense based on amount sign or keywords
            const isIncome = match[3].includes('+') || 
                           description.toLowerCase().includes('deposit') ||
                           description.toLowerCase().includes('payment received') ||
                           description.toLowerCase().includes('credit');

            transactions.push({
              date,
              description,
              amount,
              type: isIncome ? 'income' : 'expense',
              category: isIncome ? 'Income' : determineCategory(description),
              paymentMethod: 'bank_transfer'
            });
          }
          break;
        }
      }
    }

    return transactions;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF transaction history');
  }
};

// @route   POST /api/upload
// @desc    Upload and process files (images, PDFs, CSV)
// @access  Private
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    let result = {};

    try {
      if (req.file.mimetype === 'text/csv' || req.file.originalname.toLowerCase().endsWith('.csv')) {
        // Process CSV file
        const transactions = await parseCSVFile(filePath);
        
        result = {
          type: 'csv',
          transactions,
          message: `Successfully parsed ${transactions.length} transactions from CSV`,
          quickActions: {
            importAll: {
              action: 'bulk-import',
              data: transactions,
              label: `Import all ${transactions.length} transactions`
            },
            preview: {
              action: 'preview',
              data: transactions.slice(0, 5),
              label: 'Preview first 5 transactions'
            },
            selectiveImport: {
              action: 'selective-import',
              data: transactions,
              label: 'Choose transactions to import'
            }
          }
        };
      } else if (req.file.mimetype === 'application/pdf') {
        // Process PDF file
        const transactions = await parsePDFTransactions(filePath);
        
        result = {
          type: 'pdf',
          transactions,
          message: `Successfully parsed ${transactions.length} transactions from PDF`,
          quickActions: {
            importAll: {
              action: 'bulk-import',
              data: transactions,
              label: `Import all ${transactions.length} transactions`
            },
            preview: {
              action: 'preview',
              data: transactions.slice(0, 5),
              label: 'Preview first 5 transactions'
            },
            selectiveImport: {
              action: 'selective-import',
              data: transactions,
              label: 'Choose transactions to import'
            }
          }
        };
      } else if (req.file.mimetype.startsWith('image/')) {
        // Process image using OCR
        const extractedData = await extractReceiptData(filePath);
        
        const suggestedTransaction = {
          type: 'expense',
          amount: extractedData.total || 0,
          description: `Receipt from ${extractedData.merchantName || 'Unknown Merchant'}`,
          date: extractedData.date,
          category: extractedData.category,
          paymentMethod: 'credit_card'
        };
        
        result = {
          type: 'receipt',
          extractedData,
          suggestedTransaction,
          message: 'Receipt processed successfully',
          quickActions: {
            addTransaction: {
              action: 'add-single',
              data: suggestedTransaction,
              label: 'Add this transaction'
            },
            editAndAdd: {
              action: 'edit-single',
              data: suggestedTransaction,
              label: 'Edit and add transaction'
            },
            viewDetails: {
              action: 'view-details',
              data: extractedData,
              label: 'View extracted details'
            }
          }
        };
      } else {
        throw new Error('Unsupported file type');
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json(result);
    } catch (processingError) {
      // Clean up file on processing error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw processingError;
    }
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      message: 'Error processing file',
      error: error.message 
    });
  }
});

// @route   POST /api/upload/bulk-import
// @desc    Import multiple transactions from parsed data
// @access  Private
router.post('/bulk-import', auth, async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: 'No transactions provided' });
    }

    const savedTransactions = [];
    const errors = [];

    for (let i = 0; i < transactions.length; i++) {
      try {
        const transactionData = {
          ...transactions[i],
          user: req.user._id
        };

        // Validate required fields
        if (!transactionData.amount || !transactionData.description || !transactionData.date) {
          throw new Error('Missing required fields: amount, description, or date');
        }

        const transaction = new Transaction(transactionData);
        await transaction.save();
        savedTransactions.push(transaction);
      } catch (error) {
        errors.push({
          index: i,
          transaction: transactions[i],
          error: error.message
        });
      }
    }

    res.json({
      message: `Successfully imported ${savedTransactions.length} transactions`,
      imported: savedTransactions.length,
      errors: errors.length,
      errorDetails: errors,
      transactions: savedTransactions
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ 
      message: 'Error during bulk import',
      error: error.message 
    });
  }
});

// @route   POST /api/upload/selective-import
// @desc    Import selected transactions from parsed data
// @access  Private
router.post('/selective-import', auth, async (req, res) => {
  try {
    const { transactions, selectedIndices } = req.body;

    if (!Array.isArray(transactions) || !Array.isArray(selectedIndices)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    const selectedTransactions = selectedIndices.map(index => transactions[index]).filter(Boolean);

    if (selectedTransactions.length === 0) {
      return res.status(400).json({ message: 'No transactions selected' });
    }

    const savedTransactions = [];
    const errors = [];

    for (let i = 0; i < selectedTransactions.length; i++) {
      try {
        const transactionData = {
          ...selectedTransactions[i],
          user: req.user._id
        };

        // Validate required fields
        if (!transactionData.amount || !transactionData.description || !transactionData.date) {
          throw new Error('Missing required fields: amount, description, or date');
        }

        const transaction = new Transaction(transactionData);
        await transaction.save();
        savedTransactions.push(transaction);
      } catch (error) {
        errors.push({
          index: i,
          transaction: selectedTransactions[i],
          error: error.message
        });
      }
    }

    res.json({
      message: `Successfully imported ${savedTransactions.length} out of ${selectedTransactions.length} selected transactions`,
      imported: savedTransactions.length,
      errors: errors.length,
      errorDetails: errors,
      transactions: savedTransactions
    });
  } catch (error) {
    console.error('Selective import error:', error);
    res.status(500).json({ 
      message: 'Error during selective import',
      error: error.message 
    });
  }
});

// @route   POST /api/upload/add-single
// @desc    Add a single transaction
// @access  Private
router.post('/add-single', auth, async (req, res) => {
  try {
    const transactionData = {
      ...req.body,
      user: req.user._id
    };

    // Validate required fields
    if (!transactionData.amount || !transactionData.description || !transactionData.date) {
      return res.status(400).json({ message: 'Missing required fields: amount, description, or date' });
    }

    const transaction = new Transaction(transactionData);
    await transaction.save();

    res.json({
      message: 'Transaction added successfully',
      transaction
    });
  } catch (error) {
    console.error('Single transaction add error:', error);
    res.status(500).json({ 
      message: 'Error adding transaction',
      error: error.message 
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ message: error.message });
  }
  
  if (error.message.includes('File type') || error.message.includes('not supported')) {
    return res.status(400).json({ message: error.message });
  }

  next(error);
});

module.exports = router;