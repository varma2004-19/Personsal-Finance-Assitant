import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Modal, Badge, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userStats, setUserStats] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    currency: 'INR',
    monthlyBudget: 0
  });

  // Password change form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Account deletion form state
  const [deleteData, setDeleteData] = useState({
    password: '',
    confirmation: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        currency: user.currency || 'USD',
        monthlyBudget: user.monthlyBudget || 0
      });
    }
    fetchUserStats();
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/auth/stats');
      setUserStats(response.data);
    } catch (error) {
      console.error('User stats fetch error:', error);
      setError('Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      const response = await axios.put('/auth/profile', profileData);
      updateUser(response.data.user);
      setSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }

      await axios.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSuccess('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Password change error:', error);
      setError(error.response?.data?.message || 'Failed to change password');
    }
  };

  const handleAccountDeletion = async (e) => {
    e.preventDefault();
    try {
      setError('');

      if (deleteData.confirmation !== 'DELETE') {
        setError('Please type "DELETE" to confirm account deletion');
        return;
      }

      await axios.delete('/auth/account', {
        data: { password: deleteData.password }
      });

      logout();
    } catch (error) {
      console.error('Account deletion error:', error);
      setError(error.response?.data?.message || 'Failed to delete account');
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

  const calculateSavingsRate = () => {
    if (!userStats || userStats.totalIncome === 0) return 0;
    return ((userStats.totalIncome - userStats.totalExpenses) / userStats.totalIncome * 100).toFixed(1);
  };

  const getBudgetProgress = () => {
    if (!userStats || !user?.monthlyBudget) return 0;
    return Math.min((userStats.totalExpenses / user.monthlyBudget) * 100, 100);
  };

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center">
            <div className="me-4">
              <div 
                className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
                style={{ width: '80px', height: '80px', fontSize: '2rem' }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
            <div>
              <h2 className="mb-1">{user?.name}</h2>
              <p className="text-muted mb-1">{user?.email}</p>
              <small className="text-muted">
                Member since {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}
              </small>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Row>
        {/* Profile Settings */}
        <Col lg={8} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Profile Settings</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleProfileUpdate}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        Email cannot be changed. Contact support if needed.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Preferred Currency</Form.Label>
                      <Form.Select
                        value={profileData.currency}
                        onChange={(e) => setProfileData(prev => ({ ...prev, currency: e.target.value }))}
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="INR">INR - Indian Rupee</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Monthly Budget</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        value={profileData.monthlyBudget}
                        onChange={(e) => setProfileData(prev => ({ ...prev, monthlyBudget: parseFloat(e.target.value) || 0 }))}
                      />
                      <Form.Text className="text-muted">
                        Set your monthly spending budget for tracking
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-between">
                  <Button variant="primary" type="submit">
                    <i className="bi bi-check-circle me-2"></i>
                    Update Profile
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <i className="bi bi-key me-2"></i>
                    Change Password
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>

          {/* Account Statistics */}
          {userStats && (
            <Card className="mt-4">
              <Card.Header>
                <h5 className="mb-0">Account Statistics</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={3} className="text-center mb-3">
                    <div className="text-primary mb-2">
                      <i className="bi bi-receipt fs-2"></i>
                    </div>
                    <h4 className="mb-1">{userStats.transactionCount}</h4>
                    <small className="text-muted">Total Transactions</small>
                  </Col>
                  <Col md={3} className="text-center mb-3">
                    <div className="text-success mb-2">
                      <i className="bi bi-arrow-up-circle fs-2"></i>
                    </div>
                    <h4 className="text-success mb-1">{formatCurrency(userStats.totalIncome)}</h4>
                    <small className="text-muted">Total Income</small>
                  </Col>
                  <Col md={3} className="text-center mb-3">
                    <div className="text-danger mb-2">
                      <i className="bi bi-arrow-down-circle fs-2"></i>
                    </div>
                    <h4 className="text-danger mb-1">{formatCurrency(userStats.totalExpenses)}</h4>
                    <small className="text-muted">Total Expenses</small>
                  </Col>
                  <Col md={3} className="text-center mb-3">
                    <div className="text-info mb-2">
                      <i className="bi bi-percent fs-2"></i>
                    </div>
                    <h4 className="text-info mb-1">{calculateSavingsRate()}%</h4>
                    <small className="text-muted">Savings Rate</small>
                  </Col>
                </Row>

                {user?.monthlyBudget > 0 && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-medium">Monthly Budget Progress</span>
                      <span className="text-muted">
                        {formatCurrency(userStats.totalExpenses)} / {formatCurrency(user.monthlyBudget)}
                      </span>
                    </div>
                    <ProgressBar 
                      now={getBudgetProgress()} 
                      variant={getBudgetProgress() > 90 ? 'danger' : getBudgetProgress() > 75 ? 'warning' : 'success'}
                      className="mb-2"
                    />
                    <small className="text-muted">
                      {getBudgetProgress() > 100 ? 
                        `Over budget by ${formatCurrency(userStats.totalExpenses - user.monthlyBudget)}` :
                        `${formatCurrency(user.monthlyBudget - userStats.totalExpenses)} remaining this month`
                      }
                    </small>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Account Actions & Info */}
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Account Information</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <small className="text-muted">Account Status</small>
                <div>
                  <Badge bg="success" className="me-2">Active</Badge>
                  {user?.isVerified && <Badge bg="primary">Verified</Badge>}
                </div>
              </div>
              <div className="mb-3">
                <small className="text-muted">Last Login</small>
                <div>{user?.lastLogin ? formatDate(user.lastLogin) : 'Never'}</div>
              </div>
              <div className="mb-3">
                <small className="text-muted">Member Since</small>
                <div>{user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</div>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-danger">
            <Card.Header className="bg-danger text-white">
              <h5 className="mb-0">Danger Zone</h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted small mb-3">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => setShowDeleteModal(true)}
                className="w-100"
              >
                <i className="bi bi-trash me-2"></i>
                Delete Account
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Change Password Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePasswordChange}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                minLength={6}
              />
              <Form.Text className="text-muted">
                Password must be at least 6 characters long
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Change Password
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">Delete Account</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAccountDeletion}>
          <Modal.Body>
            <Alert variant="danger">
              <Alert.Heading>Warning!</Alert.Heading>
              <p>This action cannot be undone. This will permanently delete your account and all associated data including:</p>
              <ul>
                <li>All your transactions</li>
                <li>Analytics and reports</li>
                <li>Custom categories</li>
                <li>Account settings</li>
              </ul>
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>Enter your password to confirm</Form.Label>
              <Form.Control
                type="password"
                value={deleteData.password}
                onChange={(e) => setDeleteData(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type "DELETE" to confirm</Form.Label>
              <Form.Control
                type="text"
                value={deleteData.confirmation}
                onChange={(e) => setDeleteData(prev => ({ ...prev, confirmation: e.target.value }))}
                placeholder="DELETE"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              Delete My Account
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProfilePage;