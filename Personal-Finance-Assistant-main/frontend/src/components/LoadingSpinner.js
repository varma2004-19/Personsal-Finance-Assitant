import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

const LoadingSpinner = ({ message = 'Loading...', size = 'lg', centered = true }) => {
  if (centered) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" size={size} className="mb-3" />
          <div className="text-muted">{message}</div>
        </div>
      </Container>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center p-3">
      <Spinner animation="border" variant="primary" size={size} className="me-2" />
      <span className="text-muted">{message}</span>
    </div>
  );
};

export default LoadingSpinner;