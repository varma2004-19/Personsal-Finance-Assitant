import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const features = [
    {
      icon: 'bi-bar-chart',
      title: 'Smart Analytics',
      description: 'Track expenses, manage income, and gain insights into your spending habits with our intelligent analytics.'
    },
    {
      icon: 'bi-tags',
      title: 'Category Tracking',
      description: 'Automatically categorize your transactions and see where your money goes with detailed breakdowns.'
    },
    {
      icon: 'bi-graph-up',
      title: 'Growth Insights',
      description: 'Visualize your financial progress with beautiful charts and identify trends in your spending.'
    },
    {
      icon: 'bi-shield-check',
      title: 'Secure Data',
      description: 'Your financial data is protected with bank-level security and encryption protocols.'
    }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        'Track unlimited transactions',
        'Basic analytics and charts',
        'Category management',
        'Receipt OCR (5 per month)',
        'Web access'
      ],
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$9.99',
      period: 'per month',
      features: [
        'Everything in Free',
        'Advanced analytics',
        'Unlimited receipt OCR',
        'PDF transaction import',
        'Export to CSV/PDF',
        'Priority support'
      ],
      highlighted: true
    },
    {
      name: 'Business',
      price: '$19.99',
      period: 'per month',
      features: [
        'Everything in Pro',
        'Multi-user accounts',
        'Business reporting',
        'API access',
        'Custom categories',
        'Dedicated support'
      ],
      highlighted: false
    }
  ];

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center min-vh-100">
            <Col lg={6} className="text-center text-lg-start">
              <h1 className="hero-title slide-up">
                Take Control of Your 
                <span className="d-block text-warning">Financial Future</span>
              </h1>
              <p className="hero-subtitle slide-up">
                Track expenses, manage income, and gain insights into your spending habits 
                with our intelligent personal finance assistant.
              </p>
              <div className="slide-up">
                <Link to="/register">
                  <Button size="lg" className="me-3 mb-3 px-4 py-2">
                    <i className="bi bi-arrow-right me-2"></i>
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </Col>
            <Col lg={6} className="text-center">
              <div className="position-relative">
                <div className="bg-white rounded shadow-lg p-4 mb-4 text-start">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 text-dark">Monthly Overview</h6>
                    <span className="badge bg-success">+$2,450 this month</span>
                  </div>
                  <div className="row text-center">
                    <div className="col-4">
                      <div className="text-success fw-bold h5">$5,240</div>
                      <small className="text-muted">Income</small>
                    </div>
                    <div className="col-4">
                      <div className="text-danger fw-bold h5">$2,790</div>
                      <small className="text-muted">Expenses</small>
                    </div>
                    <div className="col-4">
                      <div className="text-primary fw-bold h5">$2,450</div>
                      <small className="text-muted">Saved</small>
                    </div>
                  </div>
                </div>
                <div className="bg-warning text-dark rounded shadow p-3 mb-3 text-start position-relative">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>3 bills due soon</strong>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding bg-light">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Powerful Features</h2>
              <p className="section-subtitle">Everything you need to manage your finances effectively</p>
            </Col>
          </Row>
          <Row>
            {features.map((feature, index) => (
              <Col md={6} lg={3} key={index} className="mb-4">
                <Card className="h-100 border-0 text-center">
                  <Card.Body>
                    <div className="feature-icon mx-auto">
                      <i className={feature.icon}></i>
                    </div>
                    <Card.Title className="h5 mb-3">{feature.title}</Card.Title>
                    <Card.Text className="text-muted">{feature.description}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="section-padding">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">How It Works</h2>
              <p className="section-subtitle">Get started in three simple steps</p>
            </Col>
          </Row>
          <Row>
            <Col md={4} className="text-center mb-4">
              <div className="mb-4">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{width: '80px', height: '80px', fontSize: '2rem'}}>
                  <span className="fw-bold">1</span>
                </div>
              </div>
              <h4>Sign Up Free</h4>
              <p className="text-muted">Create your account in seconds. No credit card required.</p>
            </Col>
            <Col md={4} className="text-center mb-4">
              <div className="mb-4">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{width: '80px', height: '80px', fontSize: '2rem'}}>
                  <span className="fw-bold">2</span>
                </div>
              </div>
              <h4>Add Transactions</h4>
              <p className="text-muted">Manually enter transactions or upload receipts for automatic processing.</p>
            </Col>
            <Col md={4} className="text-center mb-4">
              <div className="mb-4">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{width: '80px', height: '80px', fontSize: '2rem'}}>
                  <span className="fw-bold">3</span>
                </div>
              </div>
              <h4>Get Insights</h4>
              <p className="text-muted">View beautiful charts and analytics to understand your spending patterns.</p>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section-padding bg-light">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Simple Pricing</h2>
              <p className="section-subtitle">Choose the plan that works best for you</p>
            </Col>
          </Row>
          <Row className="justify-content-center">
            {pricingPlans.map((plan, index) => (
              <Col md={6} lg={4} key={index} className="mb-4">
                <Card className={`h-100 pricing-card ${plan.highlighted ? 'featured border-primary shadow-lg' : 'border-0'}`}>
                  {plan.highlighted && (
                    <div className="bg-primary text-white text-center py-2">
                      <small className="fw-bold">MOST POPULAR</small>
                    </div>
                  )}
                  <Card.Body className="text-center p-4">
                    <h4 className="mb-3">{plan.name}</h4>
                    <div className="mb-4">
                      <span className="display-4 fw-bold">{plan.price}</span>
                      <span className="text-muted">/{plan.period}</span>
                    </div>
                    <ul className="list-unstyled mb-4">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="mb-2">
                          <i className="bi bi-check-circle text-success me-2"></i>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      variant={plan.highlighted ? 'primary' : 'outline-primary'} 
                      size="lg" 
                      className="w-100"
                      as={Link}
                      to="/register"
                    >
                      Get Started
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-5 bg-primary text-white">
        <Container>
          <Row className="text-center">
            <Col>
              <h2 className="display-5 fw-bold mb-3">Ready to Take Control?</h2>
              <p className="lead mb-4">Join thousands of users who are already managing their finances better</p>
              <Link to="/register">
                <Button variant="light" size="lg" className="px-5 py-3">
                  <i className="bi bi-arrow-right me-2"></i>
                  Start Your Journey Today
                </Button>
              </Link>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer className="py-4 bg-dark text-white">
        <Container>
          <Row>
            <Col md={6}>
              <h5 className="text-primary-custom">FinanceTracker</h5>
              <p className="text-muted small">
                Your personal finance assistant for a better financial future.
              </p>
            </Col>
            <Col md={6} className="text-md-end">
              <p className="text-muted small mb-0">
                &copy; 2024 FinanceTracker. All rights reserved.
              </p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default HomePage;