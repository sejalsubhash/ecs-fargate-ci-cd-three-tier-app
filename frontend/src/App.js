import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [page, setPage] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser  = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setPage('dashboard');
    }
  }, []);

  function handleLoginSuccess(userData, authToken) {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setPage('dashboard');
  }

  function handleLogout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setPage('login');
  }

  if (page === 'dashboard' && user) {
    return <Dashboard user={user} token={token} onLogout={handleLogout} />;
  }
  if (page === 'register') {
    return <Register onSwitch={() => setPage('login')} onSuccess={handleLoginSuccess} />;
  }
  return <Login onSwitch={() => setPage('register')} onSuccess={handleLoginSuccess} />;
}

export default App;
