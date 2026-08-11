import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ label = 'Loading...', fullScreen = false }) => {
  return (
    <div className={`spinner-container ${fullScreen ? 'full-screen' : ''}`}>
      <div className="spinner">
        <div className="spinner-circle"></div>
      </div>
      <span className="spinner-label" role="status" aria-live="polite">
        {label}
      </span>
    </div>
  );
};

export default LoadingSpinner;
