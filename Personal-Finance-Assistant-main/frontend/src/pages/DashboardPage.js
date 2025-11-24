import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardPage = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get current month range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [summaryResponse, transactionsResponse] = await Promise.all([
        axios.get('/transactions/analytics/summary', {
          params: {
            startDate: startOfMonth.toISOString(),
            endDate: endOfMonth.toISOString()
          }
        }),
        axios.get('/transactions', {
          params: {
            limit: 5,
            sortBy: 'date',
            sortOrder: 'desc'
          }
        })
      ]);

      setSummary(summaryResponse.data);
      setRecentTransactions(transactionsResponse.data.transactions);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
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

  const getTransactionTypeColor = (type) => {
    return type === 'income' ? 'success' : 'danger';
  };

  const getTransactionIcon = (type) => {
    return type === 'income' ? 'bi-arrow-up-circle' : 'bi-arrow-down-circle';
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchDashboardData}>
            Try Again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Embedded CSS */}
      <style>{`
        .stat-card {
          background-color: #f8f9fa;
          border-radius: 16px;
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05);
        }
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 22px;
          margin-bottom: 8px;
        }
        .income-icon {
          background-color: #d1e7dd;
          color: #0f5132;
        }
        .expense-icon {
          background-color: #f8d7da;
          color: #842029;
        }
        .net-icon {
          background-color: #e2e3e5;
          color: #41464b;
        }
        .savings-icon {
          background-color: #cff4fc;
          color: #055160;
        }
        .stat-value {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .stat-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #6c757d;
        }
      `}</style>

      {/* Welcome Section */}
      <Row className="mb-4">
        <Col>
          <div className="dashboard-welcome">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="mb-1">Welcome back, {user?.name}!</h2>
                <p className="mb-0 opacity-75">Here's your financial overview for this month</p>
              </div>
              <div>
                <Link to="/transactions">
                  <Button variant="light" className="me-2 dashboard-action-btn">
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Transaction
                  </Button>
                </Link>
                <Link to="/upload">
                  <Button variant="outline-light" className="dashboard-action-btn">
                    <i className="bi bi-cloud-upload me-1"></i>
                    Upload Receipt
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Financial Overview Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex justify-content-center align-items-center mb-3">
                <div className="stat-icon-wrapper income-icon">
                  <i className="bi bi-arrow-up-circle"></i>
                </div>
              </div>
              <div className="stat-value text-success">
                {formatCurrency(summary?.summary?.totalIncome || 0)}
              </div>
              <div className="stat-label">Total Income</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex justify-content-center align-items-center mb-3">
                <div className="stat-icon-wrapper expense-icon">
                  <i className="bi bi-arrow-down-circle"></i>
                </div>
              </div>
              <div className="stat-value text-danger">
                {formatCurrency(summary?.summary?.totalExpenses || 0)}
              </div>
              <div className="stat-label">Total Expenses</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex justify-content-center align-items-center mb-3">
                <div className="stat-icon-wrapper net-icon">
                  <i className="bi bi-wallet2"></i>
                </div>
              </div>
              <div className={`stat-value ${(summary?.summary?.netIncome || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(summary?.summary?.netIncome || 0)}
              </div>
              <div className="stat-label">Net Income</div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="stat-card h-100 border-0 shadow-sm">
            <Card.Body className="text-center">
              <div className="d-flex justify-content-center align-items-center mb-3">
                <div className="stat-icon-wrapper savings-icon">
                  <i className="bi bi-percent"></i>
                </div>
              </div>
              <div className="stat-value text-info">
                {summary?.summary?.savingsRate || 0}%
              </div>
              <div className="stat-label">Savings Rate</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recent Transactions */}
        <Col lg={8} className="mb-4">
          <Card className="border-0 shadow-sm dashboard-transactions-card">
            <Card.Header className="bg-white border-0 transactions-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-clock-history me-2"></i>
                  Recent Transactions
                </h5>
                <Link to="/transactions" className="btn btn-sm btn-outline-primary view-all-btn">
                  View All
                </Link>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {recentTransactions.length > 0 ? (
                <Table responsive className="mb-0 transactions-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((transaction) => (
                      <tr key={transaction._id} className="transaction-row">
                        <td>
                          <div className="d-flex align-items-center">
                            <div className={`transaction-icon-wrapper ${getTransactionTypeColor(transaction.type)}-icon`}>
                              <i className={`${getTransactionIcon(transaction.type)}`}></i>
                            </div>
                            <span className="ms-2">{transaction.description}</span>
                          </div>
                        </td>
                        <td>
                          <Badge bg="secondary" className="text-white category-badge">
                            {transaction.category}
                          </Badge>
                        </td>
                        <td className="text-muted transaction-date">
                          {formatDate(transaction.date)}
                        </td>
                        <td className={`text-end text-${getTransactionTypeColor(transaction.type)} transaction-amount`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-5 empty-state">
                  <i className="bi bi-inbox display-4 text-muted"></i>
                  <h5 className="mt-3 text-muted">No transactions yet</h5>
                  <p className="text-muted">Start by adding your first transaction!</p>
                  <Link to="/transactions">
                    <Button variant="primary" className="add-first-transaction-btn">
                      <i className="bi bi-plus-circle me-1"></i>
                      Add Transaction
                    </Button>
                  </Link>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions & Budget */}
        <Col lg={4}>
          {/* Quick Actions */}
          <Card className="border-0 shadow-sm mb-4 quick-actions-dashboard">
            <Card.Header className="bg-white border-0 quick-actions-header">
              <h5 className="mb-0">
                <i className="bi bi-lightning me-2"></i>
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Link to="/transactions" className="btn btn-outline-primary quick-action-link">
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Income/Expense
                </Link>
                <Link to="/upload" className="btn btn-outline-secondary quick-action-link">
                  <i className="bi bi-camera me-2"></i>
                  Scan Receipt
                </Link>
                <Link to="/analytics" className="btn btn-outline-info quick-action-link">
                  <i className="bi bi-bar-chart me-2"></i>
                  View Analytics
                </Link>
                <Link to="/profile" className="btn btn-outline-warning quick-action-link">
                  <i className="bi bi-gear me-2"></i>
                  Settings
                </Link>
              </div>
            </Card.Body>
          </Card>

          {/* Budget Status */}
          {user?.monthlyBudget > 0 && (
            <Card className="border-0 shadow-sm budget-card">
              <Card.Header className="bg-white border-0 budget-header">
                <h5 className="mb-0">
                  <i className="bi bi-piggy-bank me-2"></i>
                  Monthly Budget
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="budget-stats mb-3">
                  <div className="budget-stat-item">
                    <span className="budget-label">Spent</span>
                    <span className="budget-value spent">{formatCurrency(summary?.summary?.totalExpenses || 0)}</span>
                  </div>
                  <div className="budget-stat-item">
                    <span className="budget-label">Budget</span>
                    <span className="budget-value budget">{formatCurrency(user.monthlyBudget)}</span>
                  </div>
                </div>
                
                {(() => {
                  const spent = summary?.summary?.totalExpenses || 0;
                  const budget = user.monthlyBudget;
                  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
                  const remaining = budget - spent;
                  
                  return (
                    <>
                      <div className="budget-progress-container">
                        <div className="progress budget-progress" style={{ height: '12px' }}>
                          <div 
                            className={`progress-bar ${percentage > 90 ? 'bg-danger' : percentage > 70 ? 'bg-warning' : 'bg-success'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="text-center budget-summary">
                        <div className={`budget-remaining ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(Math.abs(remaining))} {remaining >= 0 ? 'remaining' : 'over budget'}
                        </div>
                        <small className="text-muted budget-percentage">
                          {percentage.toFixed(1)}% of budget used
                        </small>
                      </div>
                    </>
                  );
                })()}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;