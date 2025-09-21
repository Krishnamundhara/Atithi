import React from 'react';

const HistoryView = ({ 
  registrations, 
  onSelectRegistration, 
  onDeleteRegistration, 
  onClearHistory, 
  isDeleting, 
  historyRef,
  onBackToForm
}) => {
  if (registrations.length === 0) {
    return (
      <div className="card history-card" ref={historyRef}>
        <h2>Registration History</h2>
        <p className="no-data">No registrations found.</p>
      </div>
    );
  }

  return (
    <div className="card history-card" ref={historyRef}>
      <h2>Registration History</h2>
      <div className="history-list">
        {registrations.map(reg => (
          <div key={reg.id} className="history-item">
            <div className="history-meta">
              <p className="clickable-name" onClick={() => onSelectRegistration(reg)}>
                <strong>Name:</strong> {reg.name}
              </p>
              <p><strong>ID Hash:</strong> {reg.idHash.substring(0, 12)}...</p>
              <p><strong>Trip:</strong> {reg.days} day(s)</p>
              <p><small>Created: {new Date(reg.createdAt).toLocaleDateString()}</small></p>
              <div className="history-actions">
                <button 
                  className="delete-item-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRegistration(reg.id);
                  }}
                >
                  Delete
                </button>
                <div className="history-hint">
                  <small>Click name to view QR code</small>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="history-controls">
        <button 
          onClick={onBackToForm} 
          className="back-button"
        >
          Back to Registration
        </button>
        <button 
          onClick={onClearHistory} 
          className="danger-button"
          disabled={isDeleting}
        >
          {isDeleting ? 'Clearing...' : 'Clear History'}
        </button>
      </div>
    </div>
  );
};

export default HistoryView;