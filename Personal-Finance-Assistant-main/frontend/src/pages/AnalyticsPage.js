import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [categoryTrends, setCategoryTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState('6');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedYear, selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const [summaryResponse, yearlyResponse, trendsResponse] = await Promise.all([
        axios.get('/transactions/analytics/summary'),
        axios.get(`/transactions/analytics/yearly?year=${selectedYear}`),
        axios.get(`/transactions/analytics/category-trends?months=${selectedPeriod}`)
      ]);

      setAnalytics(summaryResponse.data);
      setYearlyData(yearlyResponse.data);
      setCategoryTrends(trendsResponse.data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setError('Failed to load analytics data');
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

  const getMonthName = (monthNumber) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[monthNumber - 1];
  };

  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." />;
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Analytics</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchAnalytics}>
            Try Again
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Financial Analytics</h2>
              <p className="text-muted mb-0">Comprehensive insights into your financial patterns</p>
            </div>
            <div className="d-flex gap-3">
              <Form.Select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ width: 'auto' }}
              >
                {[2024, 2023, 2022, 2021, 2020].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Form.Select>
              <Form.Select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="3">Last 3 months</option>
                <option value="6">Last 6 months</option>
                <option value="12">Last 12 months</option>
                <option value="24">Last 24 months</option>
              </Form.Select>
            </div>
          </div>
        </Col>
      </Row>

      {/* Summary Cards */}
      {analytics && (
        <Row className="mb-4">
          <Col md={3} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="text-success mb-2">
                  <i className="bi bi-arrow-up-circle fs-2"></i>
                </div>
                <h4 className="text-success mb-1">{formatCurrency(analytics.summary.totalIncome)}</h4>
                <p className="text-muted small mb-0">Total Income</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="text-danger mb-2">
                  <i className="bi bi-arrow-down-circle fs-2"></i>
                </div>
                <h4 className="text-danger mb-1">{formatCurrency(analytics.summary.totalExpenses)}</h4>
                <p className="text-muted small mb-0">Total Expenses</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="text-primary mb-2">
                  <i className="bi bi-piggy-bank fs-2"></i>
                </div>
                <h4 className={`mb-1 ${analytics.summary.netIncome >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(analytics.summary.netIncome)}
                </h4>
                <p className="text-muted small mb-0">Net Income</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="text-info mb-2">
                  <i className="bi bi-percent fs-2"></i>
                </div>
                <h4 className="text-info mb-1">{analytics.summary.savingsRate}%</h4>
                <p className="text-muted small mb-0">Savings Rate</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Charts Row */}
      <Row className="mb-4">
        {/* Monthly Trends */}
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">Monthly Trends - {selectedYear}</h5>
            </Card.Header>
            <Card.Body>
              {yearlyData && (
                <div className="chart-container">
                  <div className="row text-center mb-4">
                    {Object.entries(yearlyData.monthlyData).slice(0, 6).map(([month, data]) => (
                      <div key={month} className="col-2">
                        <div className="mb-2">
                          <small className="text-muted">{getMonthName(parseInt(month))}</small>
                        </div>
                        <div className="mb-1">
                          <div className="text-success small">{formatCurrency(data.income)}</div>
                          <div className="text-danger small">{formatCurrency(data.expense)}</div>
                        </div>
                        <div className="progress" style={{ height: '4px' }}>
                          <div 
                            className="progress-bar bg-success" 
                            style={{ width: `${data.income > 0 ? Math.min((data.income / 5000) * 100, 100) : 0}%` }}
                          ></div>
                        </div>
                        <div className="progress mt-1" style={{ height: '4px' }}>
                          <div 
                            className="progress-bar bg-danger" 
                            style={{ width: `${data.expense > 0 ? Math.min((data.expense / 5000) * 100, 100) : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="row text-center">
                    {Object.entries(yearlyData.monthlyData).slice(6, 12).map(([month, data]) => (
                      <div key={month} className="col-2">
                        <div className="mb-2">
                          <small className="text-muted">{getMonthName(parseInt(month))}</small>
                        </div>
                        <div className="mb-1">
                          <div className="text-success small">{formatCurrency(data.income)}</div>
                          <div className="text-danger small">{formatCurrency(data.expense)}</div>
                        </div>
                        <div className="progress" style={{ height: '4px' }}>
                          <div 
                            className="progress-bar bg-success" 
                            style={{ width: `${data.income > 0 ? Math.min((data.income / 5000) * 100, 100) : 0}%` }}
                          ></div>
                        </div>
                        <div className="progress mt-1" style={{ height: '4px' }}>
                          <div 
                            className="progress-bar bg-danger" 
                            style={{ width: `${data.expense > 0 ? Math.min((data.expense / 5000) * 100, 100) : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Top Categories */}
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">Top Expense Categories</h5>
            </Card.Header>
            <Card.Body>
              {analytics && analytics.expensesByCategory && (
                <div>
                  {analytics.expensesByCategory.slice(0, 6).map((category, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-3">
                      <div className="flex-grow-1">
                        <div className="fw-medium">{category._id}</div>
                        <div className="progress mt-1" style={{ height: '6px' }}>
                          <div 
                            className="progress-bar" 
                            style={{ 
                              width: `${(category.total / analytics.expensesByCategory[0].total) * 100}%`,
                              backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-end ms-3">
                        <div className="fw-bold text-danger">{formatCurrency(category.total)}</div>
                        <small className="text-muted">{category.count} transactions</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Transactions & Income Categories */}
      <Row>
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">Recent Transactions</h5>
            </Card.Header>
            <Card.Body>
              {analytics && analytics.recentTransactions && (
                <div>
                  {analytics.recentTransactions.map((transaction, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <div className="d-flex align-items-center">
                        <div className={`me-3 ${transaction.type === 'income' ? 'text-success' : 'text-danger'}`}>
                          <i className={`bi ${transaction.type === 'income' ? 'bi-arrow-up-circle' : 'bi-arrow-down-circle'}`}></i>
                        </div>
                        <div>
                          <div className="fw-medium">{transaction.description}</div>
                          <small className="text-muted">{transaction.category} • {formatDate(transaction.date)}</small>
                        </div>
                      </div>
                      <div className={`fw-bold ${transaction.type === 'income' ? 'text-success' : 'text-danger'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">Income Sources</h5>
            </Card.Header>
            <Card.Body>
              {analytics && analytics.incomeByCategory && (
                <div>
                  {analytics.incomeByCategory.slice(0, 5).map((category, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-3">
                      <div className="flex-grow-1">
                        <div className="fw-medium">{category._id}</div>
                        <div className="progress mt-1" style={{ height: '6px' }}>
                          <div 
                            className="progress-bar bg-success" 
                            style={{ 
                              width: `${analytics.incomeByCategory.length > 0 ? (category.total / analytics.incomeByCategory[0].total) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-end ms-3">
                        <div className="fw-bold text-success">{formatCurrency(category.total)}</div>
                        <small className="text-muted">{category.count} transactions</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AnalyticsPage;