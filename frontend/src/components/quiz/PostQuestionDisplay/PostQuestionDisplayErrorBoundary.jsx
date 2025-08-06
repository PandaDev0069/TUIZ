import React from 'react';

/**
 * Error Boundary for PostQuestionDisplay component
 * Provides graceful fallback if any errors occur during rendering
 */
class PostQuestionDisplayErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PostQuestionDisplay Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="pqd-overlay">
          <div className="pqd-container">
            <div className="pqd-content">
              <div className="pqd-section-header">
                <span className="pqd-section-icon">⚠️</span>
                <h2 className="pqd-section-title">Display Error</h2>
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1rem' }}>
                Something went wrong displaying the results. This might be a temporary issue.
              </p>
              <button 
                onClick={() => this.props.onComplete?.()}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PostQuestionDisplayErrorBoundary;
