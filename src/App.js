import React, { useState, useEffect,useRef } from 'react';
import './App.css';
import io from 'socket.io-client';

const socket = io('localhost:8080');

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const ref = useRef()

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      console.log(socket.id);
    });
    socket.on('disconnect', () => {
      setIsConnected(false);
    });
    socket.on('message', data => {
      setLastMessage(data);
      console.log(data);
    });

    socket.on('webCredentialResponse', data => {      
      console.log(data);
    });
    socket.on('message2', data => {
      
      console.log(data);
    });
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
    };
  },[]);

  const sendMessage2 = () => {
    socket.emit('hello!',{});
  }
const sendMessage = () => {
  socket.emit('webCredentialRequest', {id:ref.current.value,age:30,credentials:[Math.random()*10000000]});
  }
  const sendMessage3 = () => {
    socket.emit('ready', {id:ref.current.value});
  }

  return (
    <div className="App">
      <header className="App-header">
        <p>Connected: { '' + isConnected }</p>
        <p>Last message: { lastMessage || '-' }</p>
        <button onClick={ sendMessage }>Say hello!</button>
      </header>
      <input  ref={ref}/>
    </div>
  );
}

export default App;