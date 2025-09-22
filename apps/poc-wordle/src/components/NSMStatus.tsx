import React from 'react';

interface NSMStatusProps {
  className?: string;
}

export const NSMStatus: React.FC<NSMStatusProps> = ({ className = '' }) => {
  return (
    <div className={`nsm-status ${className}`}>
      <span className="nsm-status-text">NSM: Connected</span>
      <button
        className="nsm-login-button"
        onClick={() => {/* NSM login functionality */}}
        aria-label="NSM Login"
      >
        Login
      </button>
    </div>
  );
};