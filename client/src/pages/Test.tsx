import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div style={{ 
      border: '4px solid green', 
      padding: '20px', 
      margin: '20px',
      backgroundColor: 'white'
    }}>
      <h1 style={{ color: 'red' }}>Test Page</h1>
      <p>If you can see this, React rendering is working!</p>
      <button 
        style={{ 
          background: 'blue', 
          color: 'white', 
          padding: '10px 20px',
          margin: '10px',
          border: 'none',
          borderRadius: '5px'
        }}
        onClick={() => alert('Button clicked!')}
      >
        Click Me
      </button>
    </div>
  );
};

export default TestPage; 