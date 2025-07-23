import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthDebugger = () => {
  const { token, user, apiCall } = useAuth();
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const testToken = async () => {
    setLoading(true);
    try {
      // Get auth info
      const authInfo = await apiCall('/debug/auth-info');
      
      // Test token verification
      const tokenTest = await apiCall('/debug/verify-token', {
        method: 'POST'
      });
      
      // Test RLS permissions
      const rlsTest = await apiCall('/debug/test-rls', {
        method: 'POST'
      });
      
      setDebugInfo({
        authInfo,
        tokenTest,
        rlsTest,
        currentToken: token ? {
          length: token.length,
          preview: token.substring(0, 30) + '...',
          hasToken: !!token,
          type: 'Supabase JWT'
        } : null,
        currentUser: user
      });
    } catch (error) {
      setDebugInfo({
        error: error.message,
        currentToken: token ? {
          length: token.length,
          preview: token.substring(0, 30) + '...',
          hasToken: !!token,
          type: 'Supabase JWT'
        } : null,
        currentUser: user
      });
    } finally {
      setLoading(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      alert('Supabase JWT token copied to clipboard!');
    }
  };

  const decodeToken = () => {
    if (token) {
      try {
        // Decode JWT without verification for inspection
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        alert(`Token Payload:\n${JSON.stringify(payload, null, 2)}`);
      } catch (error) {
        alert('Failed to decode token: ' + error.message);
      }
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: '#f0f0f0', 
      border: '1px solid #ccc', 
      padding: '10px', 
      borderRadius: '5px',
      maxWidth: '450px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <h4>🔐 Supabase Auth Debugger</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Current User:</strong> {user ? `${user.name} (${user.email})` : 'Not logged in'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Token Status:</strong> {token ? '✅ Present (Supabase JWT)' : '❌ Missing'}
        {token && (
          <div style={{ marginTop: '5px' }}>
            <small>Length: {token.length} chars</small><br/>
            <small>Preview: {token.substring(0, 40)}...</small><br/>
            <div style={{ marginTop: '5px' }}>
              <button 
                onClick={copyTokenToClipboard} 
                style={{ fontSize: '10px', marginRight: '5px', padding: '2px 6px' }}
              >
                Copy Token
              </button>
              <button 
                onClick={decodeToken} 
                style={{ fontSize: '10px', padding: '2px 6px' }}
              >
                Decode Token
              </button>
            </div>
          </div>
        )}
      </div>
      
      <button 
        onClick={testToken} 
        disabled={loading}
        style={{ 
          padding: '5px 10px', 
          marginBottom: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test Auth & RLS'}
      </button>
      
      {debugInfo && (
        <div style={{ 
          background: '#fff', 
          padding: '10px', 
          borderRadius: '3px',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <pre style={{ fontSize: '10px', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div style={{ 
        marginTop: '10px', 
        fontSize: '11px', 
        color: '#666',
        borderTop: '1px solid #ddd',
        paddingTop: '5px'
      }}>
        <strong>Note:</strong> Now using Supabase JWT tokens instead of custom JWTs.
        Tokens are issued by Supabase Auth and verified server-side.
      </div>
    </div>
  );
};

export default AuthDebugger;
