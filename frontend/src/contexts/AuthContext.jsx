import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // API base URL
  const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : `http://${window.location.hostname}:3001`;

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('tuiz_token');
    const savedUser = localStorage.getItem('tuiz_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      
      // Verify token is still valid
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Make authenticated API calls
  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE}/api${endpoint}`;
    
    // Handle different content types
    const headers = { ...options.headers };
    
    // Don't set Content-Type for FormData - let browser set it automatically
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error(`API endpoint not found: ${endpoint}`);
      }

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Details:', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          responseData: data
        });
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('API Syntax Error:', { endpoint, error });
        throw new Error(`Invalid response from server (endpoint: ${endpoint})`);
      }
      console.error('API Call Error:', { endpoint, error });
      throw error;
    }
  };

  // Verify token validity
  const verifyToken = async (tokenToVerify) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(tokenToVerify);
      } else {
        // Token is invalid, clear auth state
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (emailOrName, password) => {
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          emailOrName,
          password,
        }),
      });

      // Store auth data
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('tuiz_token', data.token);
      localStorage.setItem('tuiz_user', JSON.stringify(data.user));

      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // Register function
  const register = async (email, name, password, confirmPassword) => {
    try {
      const data = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          name,
          password,
          confirmPassword,
        }),
      });

      // Store auth data
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('tuiz_token', data.token);
      localStorage.setItem('tuiz_user', JSON.stringify(data.user));

      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('tuiz_token');
    localStorage.removeItem('tuiz_user');
  };

  // Check availability function
  const checkAvailability = async (email, name) => {
    try {
      const data = await apiCall('/auth/check-availability', {
        method: 'POST',
        body: JSON.stringify({ email, name }),
      });
      return data.availability;
    } catch (error) {
      console.error('Availability check failed:', error);
      // Return a default response if the endpoint fails
      return {
        email: { available: true },
        name: { available: true }
      };
    }
  };

  // Refresh user data from server
  const refreshUser = async () => {
    if (!token) return false;
    
    try {
      const data = await apiCall('/auth/profile');
      setUser(data.user);
      localStorage.setItem('tuiz_user', JSON.stringify(data.user));
      return true;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return false;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    checkAvailability,
    refreshUser,
    apiCall,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
