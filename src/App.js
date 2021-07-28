import React, { useState, useEffect,useRef } from 'react';
import './App.css';
function App() {  
  const [lastMessage, setLastMessage] = useState(null);
  const ref = useRef()
  return (
    <div className="App">
      <header className="App-header">
      <div id="canvas"></div>
        <p>Connected: { ''  }</p>
        <p>Last message: { lastMessage || '-' }</p>  
      </header>
      <input  ref={ref}/>
    </div>
  );
}

export default App;