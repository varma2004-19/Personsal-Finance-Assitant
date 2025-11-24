import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Modal, Alert, InputGroup } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

const TransactionsPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form state for add/edit transaction
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    tags: '',
    notes: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [currentPage, filters, sortBy, sortOrder]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: currentPage,
        limit: 15,
        sortBy,
        sortOrder,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      let response;
      if (filters.search) {
        response = await axios.get('/transactions/search', { params: { q: filters.search, ...params } });
      } else {
        response = await axios.get('/transactions', { params });
      }

      setTransactions(response.data.transactions);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Transactions fetch error:', error);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Categories fetch error:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleFormChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      };

      await axios.post('/transactions', transactionData);
      setShowAddModal(false);
      setFormData({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        tags: '',
        notes: ''
      });
      fetchTransactions();
    } catch (error) {
      console.error('Add transaction error:', error);
      setError('Failed to add transaction');
    }
  };

  const handleEditTransaction = async (e) => {
    e.preventDefault();
    try {
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      };

      await axios.put(`/transactions/${currentTransaction._id}`, transactionData);
      setShowEditModal(false);
      setCurrentTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error('Edit transaction error:', error);
      setError('Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async () => {
    try {
      if (selectedTransactions.length > 1) {
        await axios.delete('/transactions/bulk', {
          data: { transactionIds: selectedTransactions }
        });
      } else {
        await axios.delete(`/transactions/${currentTransaction._id}`);
      }
      
      setShowDeleteModal(false);
      setCurrentTransaction(null);
      setSelectedTransactions([]);
      fetchTransactions();
    } catch (error) {
      console.error('Delete transaction error:', error);
      setError('Failed to delete transaction(s)');
    }
  };

  const openEditModal = (transaction) => {
    setCurrentTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      category: transaction.category,
      description: transaction.description,
      date: new Date(transaction.date).toISOString().split('T')[0],
      paymentMethod: transaction.paymentMethod,
      tags: transaction.tags?.join(', ') || '',
      notes: transaction.notes || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (transaction = null) => {
    if (transaction) {
      setCurrentTransaction(transaction);
    }
    setShowDeleteModal(true);
  };

  const toggleTransactionSelection = (transactionId) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId) 
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const selectAllTransactions = () => {
    if (selectedTransactions.length === transactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions.map(t => t._id));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: user?.currency || 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      category: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setCurrentPage(1);
  };

  if (loading && transactions.length === 0) {
    return <LoadingSpinner message="Loading transactions..." />;
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Transactions</h2>
              <p className="text-muted mb-0">Manage and track all your financial transactions</p>
            </div>
            <div className="d-flex gap-2">
              {selectedTransactions.length > 0 && (
                <Button 
                  variant="outline-danger" 
                  onClick={() => openDeleteModal()}
                >
                  <i className="bi bi-trash me-2"></i>
                  Delete Selected ({selectedTransactions.length})
                </Button>
              )}
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>
                Add Transaction
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Type</Form.Label>
                <Form.Select 
                  value={filters.type} 
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Category</Form.Label>
                <Form.Select 
                  value={filters.category} 
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {filters.type === 'income' ? 
                    categories.income.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    )) :
                    categories.expense.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))
                  }
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Start Date</Form.Label>
                <Form.Control 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>End Date</Form.Label>
                <Form.Control 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <Form.Control 
                    type="text" 
                    placeholder="Search transactions..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                  <Button variant="outline-secondary" onClick={clearFilters}>
                    <i className="bi bi-x"></i>
                  </Button>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={1} className="d-flex align-items-end">
              <Button variant="outline-primary" onClick={fetchTransactions}>
                <i className="bi bi-arrow-clockwise"></i>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Transactions Table */}
      <Card>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>
                  <Form.Check 
                    type="checkbox"
                    checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                    onChange={selectAllTransactions}
                  />
                </th>
                <th 
                  role="button" 
                  onClick={() => handleSort('date')}
                  className="user-select-none"
                >
                  Date {sortBy === 'date' && (
                    <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th 
                  role="button" 
                  onClick={() => handleSort('type')}
                  className="user-select-none"
                >
                  Type {sortBy === 'type' && (
                    <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th>Description</th>
                <th>Category</th>
                <th 
                  role="button" 
                  onClick={() => handleSort('amount')}
                  className="user-select-none text-end"
                >
                  Amount {sortBy === 'amount' && (
                    <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th>Payment Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction._id}>
                  <td>
                    <Form.Check 
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction._id)}
                      onChange={() => toggleTransactionSelection(transaction._id)}
                    />
                  </td>
                  <td>{formatDate(transaction.date)}</td>
                  <td>
                    <Badge bg={transaction.type === 'income' ? 'success' : 'danger'}>
                      <i className={`bi bi-arrow-${transaction.type === 'income' ? 'up' : 'down'}-circle me-1`}></i>
                      {transaction.type}
                    </Badge>
                  </td>
                  <td>
                    <div>
                      <div className="fw-medium">{transaction.description}</div>
                      {transaction.tags && transaction.tags.length > 0 && (
                        <div className="mt-1">
                          {transaction.tags.map((tag, index) => (
                            <Badge key={index} bg="secondary" className="me-1 small">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{transaction.category}</td>
                  <td className={`text-end fw-bold ${transaction.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </td>
                  <td>
                    <Badge bg="light" text="dark">
                      {transaction.paymentMethod?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => openEditModal(transaction)}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => openDeleteModal(transaction)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {transactions.length === 0 && !loading && (
            <div className="text-center py-5">
              <i className="bi bi-receipt display-1 text-muted"></i>
              <h4 className="mt-3">No transactions found</h4>
              <p className="text-muted">Start by adding your first transaction</p>
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>
                Add Transaction
              </Button>
            </div>
          )}
        </Card.Body>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Footer className="bg-white border-top">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                Showing page {currentPage} of {totalPages}
              </div>
              <div className="d-flex gap-1">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + Math.max(1, currentPage - 2);
                  return page <= totalPages ? (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'primary' : 'outline-primary'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ) : null;
                })}
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Add/Edit Transaction Modal */}
      <Modal show={showAddModal || showEditModal} onHide={() => {
        setShowAddModal(false);
        setShowEditModal(false);
        setCurrentTransaction(null);
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {showAddModal ? 'Add New Transaction' : 'Edit Transaction'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={showAddModal ? handleAddTransaction : handleEditTransaction}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type *</Form.Label>
                  <Form.Select 
                    value={formData.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    required
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amount *</Form.Label>
                  <Form.Control 
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => handleFormChange('amount', e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category *</Form.Label>
                  <Form.Select 
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    {(formData.type === 'income' ? categories.income : categories.expense).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date *</Form.Label>
                  <Form.Control 
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Description *</Form.Label>
              <Form.Control 
                type="text"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                required
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Method</Form.Label>
                  <Form.Select 
                    value={formData.paymentMethod}
                    onChange={(e) => handleFormChange('paymentMethod', e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="digital_wallet">Digital Wallet</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tags</Form.Label>
                  <Form.Control 
                    type="text"
                    placeholder="Comma-separated tags"
                    value={formData.tags}
                    onChange={(e) => handleFormChange('tags', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control 
                as="textarea"
                rows={3}
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              setCurrentTransaction(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {showAddModal ? 'Add Transaction' : 'Update Transaction'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTransactions.length > 1 ? (
            <p>Are you sure you want to delete {selectedTransactions.length} selected transactions? This action cannot be undone.</p>
          ) : (
            <p>Are you sure you want to delete this transaction? This action cannot be undone.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteTransaction}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TransactionsPage;