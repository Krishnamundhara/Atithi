import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'react-qr-code'
import SHA256 from 'crypto-js/sha256'
import Hex from 'crypto-js/enc-hex'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'

// API URL - dynamically set for development vs production
const API_URL = process.env.VITE_API_URL || '/api';
// Cache control for fetch requests
const fetchOptions = {
  headers: { 'Cache-Control': 'no-cache' }
};

function App() {
  // Reference for form scrolling on mobile
  const formRef = useRef(null);
  const historyRef = useRef(null);
  const [form, setForm] = useState({
    fullName: '',
    idNumber: '', // Passport/Visa Number
    days: '',
  })
  const [registrations, setRegistrations] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState(null)
  const [apiError, setApiError] = useState('')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [adminData, setAdminData] = useState(null)

  // Fetch registrations from server on component mount
  useEffect(() => {
    fetchRegistrations();
  }, [])
  
  // Function to fetch registrations from the server
  const fetchRegistrations = async () => {
    try {
      // If user entered an ID number, use it to filter registrations
      let url = `${API_URL}/registrations`;
      const searchParams = new URLSearchParams();
      
      if (form.idNumber) {
        const idHash = hashData(form.idNumber.trim());
        searchParams.append('idHash', idHash);
        url += `?${searchParams.toString()}`;
      }
      
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      setRegistrations(data);
      
      // Update localStorage cache
      localStorage.setItem('atithiRegistrations', JSON.stringify(data));
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setApiError('Failed to load registrations. Using local data instead.');
      
      // Fallback to localStorage if API fails
      const savedRegistrations = localStorage.getItem('atithiRegistrations');
      if (savedRegistrations) {
        try {
          setRegistrations(JSON.parse(savedRegistrations));
        } catch (err) {
          console.error('Failed to parse local registrations:', err);
        }
      }
    }
  }

  // Hash sensitive data 
  const hashData = (text) => {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return Hex.stringify(SHA256(text))
  }

  const qrPayload = useMemo(() => {
    const now = new Date()
    const expires = form.days ? new Date(now.getTime() + Number(form.days) * 24 * 60 * 60 * 1000) : null
    
    // Create registration with hashed ID
    const hashedId = hashData(form.idNumber.trim())
    
    return {
      schema: 'atithi.v1',
      name: form.fullName.trim(),
      id: hashedId.substring(0, 12) + '...', // Store partial hash in QR
      idHash: hashedId, // Full hash
      days: Number(form.days),
      issuedAt: now.toISOString(),
      expiresAt: expires ? expires.toISOString() : null,
    }
  }, [form])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  // Save registration to server
  async function saveRegistration(registration) {
    try {
      console.log('Saving registration to API:', `${API_URL}/registrations`);
      const response = await fetch(`${API_URL}/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(registration),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Registration response:', result);
      
      // The server now returns an object with success info and the registration
      const savedRegistration = result.registration || registration;
      const updatedRegistrations = [...registrations, savedRegistration];
      setRegistrations(updatedRegistrations);
      
      // Also save to localStorage as backup
      localStorage.setItem('atithiRegistrations', JSON.stringify(updatedRegistrations));
      return savedRegistration;
    } catch (err) {
      console.error('Error saving registration:', err);
      setApiError('Failed to save to server. Stored locally only.');
      
      // Fallback to localStorage only
      const localRegistration = {
        ...registration,
        id: Date.now().toString() // Ensure the registration has an ID
      };
      const updatedRegistrations = [...registrations, localRegistration];
      setRegistrations(updatedRegistrations);
      localStorage.setItem('atithiRegistrations', JSON.stringify(updatedRegistrations));
      return localRegistration;
    }
  }
  
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setApiError('')
    setIsLoading(true)
    
    try {
      // basic validation
      if (!form.fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!form.idNumber.trim()) {
        setError('Please enter your Passport/Visa Number.');
        return;
      }
      const daysNum = Number(form.days)
      if (!Number.isFinite(daysNum) || daysNum <= 0) {
        setError('Trip Duration must be a positive number of days.');
        return;
      }
      
      // Create a registration object with current timestamp
      const now = new Date()
      const registration = {
        id: Date.now().toString(), // unique ID for the registration
        name: form.fullName.trim(),
        idHash: hashData(form.idNumber.trim()),
        days: Number(form.days),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + Number(form.days) * 24 * 60 * 60 * 1000).toISOString(),
      }
      
      // Save to server and localStorage
      const savedRegistration = await saveRegistration(registration);
      if (savedRegistration) {
        setSelectedRegistration(savedRegistration);
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setSubmitted(false)
    setForm({ fullName: '', idNumber: '', days: '' })
    setError('')
    setShowHistory(false)
    // Ensure smooth scroll to top on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  async function clearHistory() {
    if (window.confirm('Are you sure you want to clear all registration history?')) {
      try {
        // Clear from server
        const response = await fetch(`${API_URL}/registrations`, {
          method: 'DELETE',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        // Clear local state and storage
        setRegistrations([]);
        localStorage.removeItem('atithiRegistrations');
        setShowHistory(false);
      } catch (err) {
        console.error('Error clearing registrations:', err);
        setApiError('Failed to clear data from server. Cleared locally only.');
        
        // Fallback to clearing locally only
        setRegistrations([]);
        localStorage.removeItem('atithiRegistrations');
        setShowHistory(false);
      }
    }
  }
  
  // Delete a specific registration
  async function deleteRegistration(id) {
    try {
      const response = await fetch(`${API_URL}/registrations/${id}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      // Update local state
      const updatedRegistrations = registrations.filter(reg => reg.id !== id);
      setRegistrations(updatedRegistrations);
      
      // Update localStorage
      localStorage.setItem('atithiRegistrations', JSON.stringify(updatedRegistrations));
    } catch (err) {
      console.error(`Error deleting registration ${id}:`, err);
      setApiError('Failed to delete from server. Removed from local view only.');
      
      // Remove from local state anyway
      const updatedRegistrations = registrations.filter(reg => reg.id !== id);
      setRegistrations(updatedRegistrations);
      localStorage.setItem('atithiRegistrations', JSON.stringify(updatedRegistrations));
    }
  }
  
  // Add effect to manage view transitions
  useEffect(() => {
    // Scroll to top when toggling between views
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Focus on first input when showing form
    if (!showHistory && formRef.current) {
      setTimeout(() => {
        const firstInput = formRef.current.querySelector('input')
        if (firstInput) firstInput.focus()
      }, 300)
    }
  }, [showHistory, submitted])

  // State for delete operations
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Function to render the appropriate content based on state
  const renderContent = useCallback(() => {
    // If form has been submitted, show QR code
    if (submitted) {
      return (
        <div className="card qr-card">
          <div className="qr-wrapper" aria-label="Registration QR Code">
            <QRCode
              value={JSON.stringify(qrPayload)}
              size={320}
              level="M"
              style={{ width: '100%', height: 'auto' }}
              fgColor="#0f172a"
            />
          </div>
          <div className="qr-meta">
            <p><strong>Name:</strong> {qrPayload.name}</p>
            <p><strong>ID (Hashed):</strong> {qrPayload.id}</p>
            <p><strong>Trip:</strong> {qrPayload.days} day(s)</p>
            <p><small>Saved to device storage</small></p>
          </div>
          <div className="actions">
            <button onClick={reset}>Back</button>
            <button onClick={() => window.print()} className="secondary">Print</button>
          </div>
        </div>
      );
    }
    
    // If history is shown
    if (showHistory) {
      // If a registration is selected, show its QR code
      if (selectedRegistration) {
        return (
          <div className="card qr-detail-card">
            <h2>Tourist QR Code</h2>
            <div className="qr-wrapper">
              <QRCode
                value={JSON.stringify({
                  schema: 'atithi.v1',
                  name: selectedRegistration.name,
                  idHash: selectedRegistration.idHash,
                  days: selectedRegistration.days,
                  issuedAt: selectedRegistration.createdAt,
                  expiresAt: selectedRegistration.expiresAt,
                })}
                size={320}
                level="M"
                style={{ width: '100%', height: 'auto' }}
                fgColor="#0f172a"
              />
            </div>
            <div className="qr-meta">
              <p><strong>Name:</strong> {selectedRegistration.name}</p>
              <p><strong>ID Hash:</strong> {selectedRegistration.idHash.substring(0, 12)}...</p>
              <p><strong>Trip:</strong> {selectedRegistration.days} day(s)</p>
              <p><small>Created: {new Date(selectedRegistration.createdAt).toLocaleDateString()}</small></p>
            </div>
            <div className="actions">
              <button onClick={() => setSelectedRegistration(null)}>Back to History</button>
              <button onClick={() => window.print()} className="secondary">Print</button>
            </div>
          </div>
        );
      }
      
      // Import and use the HistoryView component
      const HistoryView = React.lazy(() => import('./components/HistoryView'));
      
      const handleClearHistory = () => {
        setIsDeleting(true);
        clearHistory().finally(() => setIsDeleting(false));
      };
      
      return (
        <React.Suspense fallback={<div>Loading history view...</div>}>
          <HistoryView 
            registrations={registrations}
            onSelectRegistration={setSelectedRegistration}
            onDeleteRegistration={deleteRegistration}
            onClearHistory={handleClearHistory}
            isDeleting={isDeleting}
            historyRef={historyRef}
            onBackToForm={() => setShowHistory(false)}
          />
        </React.Suspense>
      );
    }
    
    // Default: show the registration form
    return (
      <form className="card" ref={formRef} onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="e.g., Priya Sharma"
            value={form.fullName}
            onChange={handleChange}
            autoComplete="name"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="idNumber">Passport/Visa Number</label>
          <input
            id="idNumber"
            name="idNumber"
            type="text"
            placeholder="e.g., N1234567"
            value={form.idNumber}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="days">Trip Duration (in days)</label>
          <input
            id="days"
            name="days"
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="e.g., 14"
            value={form.days}
            onChange={handleChange}
            required
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary">Generate QR</button>
      </form>
    );
  }, [form, error, formRef, qrPayload, submitted, showHistory, selectedRegistration, registrations, isDeleting, setIsDeleting, clearHistory, setSelectedRegistration, historyRef]);

  // State for loading indicators
  const [isLoading, setIsLoading] = useState(false);
  
  // Wrap API operations with loading state
  const wrappedFetchRegistrations = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchRegistrations();
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    // Check for admin token on load
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      setIsAdminLoggedIn(true);
    }
    
    // Only fetch user registrations if not admin view
    if (!isAdminLoggedIn) {
      wrappedFetchRegistrations();
    }
  }, [wrappedFetchRegistrations, isAdminLoggedIn]);
  
  // Handle admin login
  const handleAdminLogin = (data) => {
    setAdminData(data);
    setIsAdminLoggedIn(true);
    setShowAdminLogin(false);
  };
  
  // Handle admin logout
  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAdminLoggedIn(false);
    setAdminData(null);
    wrappedFetchRegistrations(); // Fetch user registrations after logout
  };
  
  return (
    <div className="container">
      <header>
        <h1>Atithi — The Guardian Protocol</h1>
        <p className="subtitle">Tourist Registration</p>
        {!submitted && !isAdminLoggedIn && !showAdminLogin && (
          <div className="nav-actions">
            <button 
              onClick={() => {
                setShowHistory(!showHistory);
                setSelectedRegistration(null); // Clear selection when toggling
                setApiError(''); // Clear any existing errors
              }} 
              className="text-button"
              disabled={isLoading}
            >
              {isLoading ? '...' : 'Show My Registrations'}
            </button>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="admin-button"
            >
              Admin Access
            </button>
          </div>
        )}
      </header>

      {isAdminLoggedIn ? (
        <AdminDashboard onLogout={handleAdminLogout} />
      ) : showAdminLogin ? (
        <AdminLogin 
          onLogin={handleAdminLogin}
          onCancel={() => setShowAdminLogin(false)} 
        />
      ) : isLoading && !apiError ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        renderContent()
      )}
      
      <footer>
        <small>Privacy: Sensitive data is hashed and stored securely.</small>
        {apiError && !isAdminLoggedIn && !showAdminLogin && (
          <div className="api-error">
            <p>{apiError}</p>
            <button onClick={() => {
              setApiError('');
              wrappedFetchRegistrations();
            }} className="retry-button">
              Retry
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

export default App
