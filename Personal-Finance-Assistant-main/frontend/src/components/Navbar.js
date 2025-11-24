import React from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <BootstrapNavbar bg="white" expand="lg" className="shadow-sm">
      <Container>
        <LinkContainer to="/">
          <BootstrapNavbar.Brand className="d-flex align-items-center">
            <i className="bi bi-wallet2 me-2" style={{ fontSize: '1.5rem', color: '#28a745' }}></i>
            <span className="text-primary-custom fw-bold">FinanceTracker</span>
          </BootstrapNavbar.Brand>
        </LinkContainer>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {!isAuthenticated() && (
              <>
                <LinkContainer to="/">
                  <Nav.Link>Home</Nav.Link>
                </LinkContainer>
                <Nav.Link href="#features">Features</Nav.Link>
                <Nav.Link href="#how-it-works">How it Works</Nav.Link>
                <Nav.Link href="#pricing">Pricing</Nav.Link>
              </>
            )}

            {isAuthenticated() && (
              <>
                <LinkContainer to="/dashboard">
                  <Nav.Link>
                    <i className="bi bi-speedometer2 me-1"></i>
                    Dashboard
                  </Nav.Link>
                </LinkContainer>
                <LinkContainer to="/transactions">
                  <Nav.Link>
                    <i className="bi bi-list-ul me-1"></i>
                    Transactions
                  </Nav.Link>
                </LinkContainer>
                <LinkContainer to="/analytics">
                  <Nav.Link>
                    <i className="bi bi-bar-chart me-1"></i>
                    Analytics
                  </Nav.Link>
                </LinkContainer>
                <LinkContainer to="/upload">
                  <Nav.Link>
                    <i className="bi bi-cloud-upload me-1"></i>
                    Upload
                  </Nav.Link>
                </LinkContainer>
              </>
            )}
          </Nav>

          <Nav>
            {!isAuthenticated() ? (
              <>
                <LinkContainer to="/login">
                  <Nav.Link>Log In</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/register">
                  <Nav.Link>
                    <button className="btn btn-primary btn-sm">
                      Sign Up Free
                    </button>
                  </Nav.Link>
                </LinkContainer>
              </>
            ) : (
              <NavDropdown 
                title={
                  <span>
                    <i className="bi bi-person-circle me-1"></i>
                    {user?.name || 'User'}
                  </span>
                } 
                id="user-dropdown"
                align="end"
              >
                <LinkContainer to="/profile">
                  <NavDropdown.Item>
                    <i className="bi bi-person me-2"></i>
                    Profile
                  </NavDropdown.Item>
                </LinkContainer>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar;