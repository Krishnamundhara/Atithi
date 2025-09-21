import React from 'react';

const ErrorAlert = ({ message, onRetry, onDismiss }) => {
  return (
    <div className="api-error">
      <p>{message}</p>
      <div className="error-actions">
        {onRetry && (
          <button onClick={onRetry} className="btn btn-sm">
            Retry
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="btn btn-sm btn-secondary">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;