// API configuration and helper functions
// This centralizes all API calls for the application

// Get the API URL from environment or use default (for Netlify functions)
const API_URL = process.env.VITE_API_URL || '/.netlify/functions/api';

// Generic fetch wrapper with error handling
const fetchApi = async (endpoint, options = {}) => {
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    // Parse JSON response
    const data = await response.json();
    
    // Handle non-200 responses
    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
};

// Authentication helpers
export const loginAdmin = async (username, password) => {
  return fetchApi('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Tourist registration functions
export const createRegistration = async (registrationData) => {
  return fetchApi('/registrations', {
    method: 'POST',
    body: JSON.stringify(registrationData)
  });
};

export const getRegistrationsByIdHash = async (idHash) => {
  return fetchApi(`/registrations?idHash=${encodeURIComponent(idHash)}`);
};

// Admin functions
export const getAllRegistrations = async () => {
  return fetchApi('/admin/registrations', {
    headers: getAuthHeaders()
  });
};

export const deleteRegistration = async (id) => {
  return fetchApi(`/admin/registrations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
};

export const deleteAllRegistrations = async () => {
  return fetchApi('/admin/registrations', {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
};

export const checkApiHealth = async () => {
  return fetchApi('/health');
};

// Export default API object with all functions
export default {
  loginAdmin,
  createRegistration,
  getRegistrationsByIdHash,
  getAllRegistrations,
  deleteRegistration,
  deleteAllRegistrations,
  checkApiHealth
};