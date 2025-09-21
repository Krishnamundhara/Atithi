import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

const AdminDashboard = ({ onLogout }) => {
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [filterText, setFilterText] = useState('');

  const API_URL = process.env.VITE_API_URL || '/api';

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_URL}/admin/registrations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token expired or invalid
          localStorage.removeItem('adminToken');
          onLogout();
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRegistrations(data);
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRegistration = async (id) => {
    if (!window.confirm('Are you sure you want to delete this registration?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_URL}/admin/registrations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      // Remove from state
      setRegistrations(prev => prev.filter(reg => reg.id !== id));
      
      if (selectedRegistration && selectedRegistration.id === id) {
        setSelectedRegistration(null);
      }
    } catch (err) {
      console.error('Failed to delete registration:', err);
      setError(err.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL registrations? This cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_URL}/admin/registrations`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      setRegistrations([]);
      setSelectedRegistration(null);
    } catch (err) {
      console.error('Failed to clear registrations:', err);
      setError(err.message);
    }
  };

  const filteredRegistrations = registrations.filter(reg => 
    reg.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <button onClick={onLogout} className="btn secondary">Logout</button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="admin-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Filter by name..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <button 
          onClick={fetchRegistrations} 
          className="btn refresh-btn"
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>
      
      <div className="admin-content">
        <div className="registrations-list">
          <h3>Registrations ({filteredRegistrations.length})</h3>
          
          {isLoading ? (
            <div className="loading-spinner-container">
              <div className="loading-spinner"></div>
              <p>Loading registrations...</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <p className="no-data">No registrations found.</p>
          ) : (
            <div className="table-container">
              <table className="registrations-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>Days</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map(reg => (
                    <tr key={reg.id}>
                      <td>
                        <span 
                          className="clickable-name" 
                          onClick={() => setSelectedRegistration(reg)}
                        >
                          {reg.name}
                        </span>
                      </td>
                      <td>{new Date(reg.createdAt).toLocaleDateString()}</td>
                      <td>{new Date(reg.expiresAt).toLocaleDateString()}</td>
                      <td>{reg.days}</td>
                      <td>
                        <button 
                          onClick={() => handleDeleteRegistration(reg.id)}
                          className="btn-sm danger-btn"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {filteredRegistrations.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="btn danger-button clear-all-btn"
            >
              Clear All Registrations
            </button>
          )}
        </div>
        
        {selectedRegistration && (
          <div className="registration-detail">
            <h3>Registration Details</h3>
            <div className="qr-code-container">
              <QRCode
                value={JSON.stringify({
                  schema: 'atithi.v1',
                  name: selectedRegistration.name,
                  idHash: selectedRegistration.idHash,
                  days: selectedRegistration.days,
                  issuedAt: selectedRegistration.createdAt,
                  expiresAt: selectedRegistration.expiresAt,
                })}
                size={200}
                level="M"
                fgColor="#0f172a"
              />
            </div>
            <div className="registration-info">
              <p><strong>Name:</strong> {selectedRegistration.name}</p>
              <p><strong>ID Hash:</strong> {selectedRegistration.idHash}</p>
              <p><strong>Created:</strong> {new Date(selectedRegistration.createdAt).toLocaleString()}</p>
              <p><strong>Expires:</strong> {new Date(selectedRegistration.expiresAt).toLocaleString()}</p>
              <p><strong>Trip Duration:</strong> {selectedRegistration.days} days</p>
              <button 
                onClick={() => setSelectedRegistration(null)} 
                className="btn secondary"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;