import React, { useState, useEffect } from 'react';

const AdminLogin = ({ onLogin, onCancel }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('unknown');

  // Make sure the API URL is dynamically set for development vs production
  const API_URL = process.env.VITE_API_URL || '/api';

  // Test server connection on component load
  useEffect(() => {
    testServerConnection();
  }, []);

  const testServerConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/test`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        setServerStatus('online');
        console.log('Server is online');
      } else {
        setServerStatus('error');
        console.error('Server returned error status');
      }
    } catch (err) {
      console.error('Server connection test failed:', err);
      setServerStatus('offline');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (serverStatus !== 'online') {
      await testServerConnection();
      if (serverStatus !== 'online') {
        setError('Server appears to be offline. Please check if the server is running.');
        setIsLoading(false);
        return;
      }
    }

    try {
      console.log(`Attempting to login with username: ${username}, password: ${password.substring(0, 2)}...`);
      
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('Login response status:', response.status);
      
      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed - invalid credentials');
      }

      localStorage.setItem('adminToken', data.token);
      console.log('Login successful, token stored');
      onLogin(data);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle setup account click
  const handleSetupClick = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/setup`);
      const data = await response.json();
      
      if (response.ok) {
        setUsername(data.credentials.username);
        setPassword(data.credentials.password);
        setError('');
        alert('Admin account has been set up. You can now login with the pre-filled credentials.');
      } else {
        setError('Failed to set up admin account: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setError('Failed to set up admin account: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <h2>Admin Login</h2>
      
      {serverStatus === 'offline' && (
        <div className="error-message">
          <p>Server appears to be offline. Please make sure the Node.js server is running.</p>
          <code>cd "SIH/qr" && node admin-server.js</code>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter admin username"
            autoComplete="username"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn secondary" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn primary" 
            disabled={isLoading || serverStatus === 'offline'}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
      
      <div className="login-help">
        <p>Using credentials: username "{username}", password "{password}"</p>
        <button 
          onClick={handleSetupClick} 
          className="text-button"
          disabled={isLoading || serverStatus === 'offline'}
        >
          Setup Admin Account
        </button>
      </div>
      
      <div className="server-status">
        <small>Server Status: 
          {serverStatus === 'online' && <span className="status-online"> Online ✓</span>}
          {serverStatus === 'offline' && <span className="status-offline"> Offline ✗</span>}
          {serverStatus === 'error' && <span className="status-error"> Error !</span>}
          {serverStatus === 'unknown' && <span className="status-unknown"> Checking...</span>}
        </small>
      </div>
    </div>
  );
};

export default AdminLogin;