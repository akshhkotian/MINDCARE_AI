import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Read persisted session from sessionStorage (per tab isolation)
    const storedUser = sessionStorage.getItem('mindcare_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        sessionStorage.removeItem('mindcare_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    setError(null);
    try {
      const res = await authAPI.login({ email, password, role });
      const loggedUser = res.data.user;
      setUser(loggedUser);
      sessionStorage.setItem('mindcare_user', JSON.stringify(loggedUser));
      return loggedUser;
    } catch (err) {
      let errMsg = 'Login failed.';
      if (err.response && err.response.data && err.response.data.error) {
        errMsg = err.response.data.error;
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        errMsg = 'Cannot connect to Flask server. Please make sure "python app.py" is running on port 5000.';
      } else {
        errMsg = err.message || 'Login failed. Please check credentials.';
      }
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await authAPI.register(userData);
      return res.data;
    } catch (err) {
      let errMsg = 'Registration failed.';
      if (err.response && err.response.data && err.response.data.error) {
        errMsg = err.response.data.error;
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        errMsg = 'Cannot connect to Flask backend server. Please make sure "python app.py" is running on port 5000.';
      } else {
        errMsg = err.message || 'Registration failed.';
      }
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('mindcare_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
