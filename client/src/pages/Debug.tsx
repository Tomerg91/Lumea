import React from 'react';

const DebugPage = () => {
  const [windowSize, setWindowSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  const [domStats, setDomStats] = React.useState({
    divCount: 0,
    buttonCount: 0,
    linkCount: 0,
    imageCount: 0,
    rootContent: ''
  });
  
  // Update DOM stats on component mount
  React.useEffect(() => {
    setDomStats({
      divCount: document.querySelectorAll('div').length,
      buttonCount: document.querySelectorAll('button').length,
      linkCount: document.querySelectorAll('a').length,
      imageCount: document.querySelectorAll('img').length,
      rootContent: document.getElementById('root')?.innerHTML.slice(0, 200) + '...' || 'Not found'
    });
    
    // Track window resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Define inline styles for debugging
  const debugSectionStyle = {
    margin: '20px 0',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#f9f9f9'
  };
  
  const debugHeaderStyle = {
    backgroundColor: '#333',
    color: '#fff',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '4px'
  };
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#e63946', textAlign: 'center', marginBottom: '30px' }}>🐛 React Debug Page 🐛</h1>
      
      <div style={debugSectionStyle}>
        <h2 style={debugHeaderStyle}>1. Environment Info</h2>
        <div>
          <p><strong>Window Size:</strong> {windowSize.width}px × {windowSize.height}px</p>
          <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        </div>
      </div>
      
      <div style={debugSectionStyle}>
        <h2 style={debugHeaderStyle}>2. DOM Status</h2>
        <div>
          <p><strong>DIV Elements:</strong> {domStats.divCount}</p>
          <p><strong>Button Elements:</strong> {domStats.buttonCount}</p>
          <p><strong>Link Elements:</strong> {domStats.linkCount}</p>
          <p><strong>Image Elements:</strong> {domStats.imageCount}</p>
        </div>
      </div>
      
      <div style={debugSectionStyle}>
        <h2 style={debugHeaderStyle}>3. Root Element Preview</h2>
        <pre style={{ 
          overflow: 'auto', 
          backgroundColor: '#282c34', 
          color: '#abb2bf',
          padding: '10px',
          borderRadius: '4px',
          maxHeight: '200px'
        }}>
          {domStats.rootContent}
        </pre>
      </div>
      
      <div style={debugSectionStyle}>
        <h2 style={debugHeaderStyle}>4. Test Elements</h2>
        <div>
          <button 
            onClick={() => alert('Button clicked!')}
            style={{ 
              backgroundColor: '#4CAF50', 
              border: 'none', 
              color: 'white',
              padding: '10px 20px',
              textAlign: 'center',
              display: 'inline-block',
              fontSize: '16px',
              margin: '10px',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Click Me (Plain Button)
          </button>
          
          <div className="bg-blue-500 text-white p-4 m-2">
            This should be blue if Tailwind is working
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPage; 