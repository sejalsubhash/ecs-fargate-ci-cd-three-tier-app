import React, { useState, useEffect } from 'react';
import { getUsers, profile } from '../api';

export default function Dashboard({ user, token, onLogout }) {
  const [users, setUsers]       = useState([]);
  const [profileData, setProfile] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, usersRes] = await Promise.all([profile(), getUsers()]);
        setProfile(profileRes.data.user);
        setUsers(usersRes.data.users);
      } catch (err) {
        setError('Failed to load data. Please refresh.');
        if (err.response?.status === 401 || err.response?.status === 403) {
          onLogout();
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="dashboard-wrapper">
      <nav className="navbar">
        <div className="navbar-brand">Three-Tier App</div>
        <div className="navbar-user">
          <span>Hello, {user.name}</span>
          <button onClick={onLogout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        {error && <div className="alert alert-error">{error}</div>}

        {/* Profile Card */}
        <div className="card">
          <h2 className="card-title">My Profile</h2>
          {profileData ? (
            <div className="profile-grid">
              <div className="profile-item">
                <span className="label">Name</span>
                <span className="value">{profileData.name}</span>
              </div>
              <div className="profile-item">
                <span className="label">Email</span>
                <span className="value">{profileData.email}</span>
              </div>
              <div className="profile-item">
                <span className="label">Member since</span>
                <span className="value">{new Date(profileData.created_at).toLocaleDateString()}</span>
              </div>
              <div className="profile-item">
                <span className="label">User ID</span>
                <span className="value">#{profileData.id}</span>
              </div>
            </div>
          ) : loading ? (
            <p className="loading-text">Loading profile...</p>
          ) : null}
        </div>

        {/* Registered Users Table */}
        <div className="card">
          <h2 className="card-title">Registered Users
            <span className="badge">{users.length}</span>
          </h2>
          {loading ? (
            <p className="loading-text">Loading users...</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={u.id === user.id ? 'highlight-row' : ''}>
                      <td>#{u.id}</td>
                      <td>{u.name} {u.id === user.id && <span className="you-badge">You</span>}</td>
                      <td>{u.email}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Architecture Info */}
        <div className="card info-card">
          <h2 className="card-title">Architecture</h2>
          <div className="arch-row">
            <div className="arch-box">
              <div className="arch-icon">N</div>
              <div className="arch-label">Frontend</div>
              <div className="arch-sub">React + Nginx</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-box">
              <div className="arch-icon">JS</div>
              <div className="arch-label">Backend</div>
              <div className="arch-sub">Node.js API</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-box">
              <div className="arch-icon">DB</div>
              <div className="arch-label">Database</div>
              <div className="arch-sub">RDS MySQL</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
