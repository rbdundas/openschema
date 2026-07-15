import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage user authentication state and interactions.
 * Integrates with the backend /api/login, /api/register, /api/logout, and /api/me routes.
 *
 * @returns {Object} Authentication state and actions: { user, loading, error, login, register, logout, checkStatus, setError }
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser({ username: data.username });
      } else {
        setUser(null);
      }
    } catch (err) {
      // Do not log a warning on unauthorized checking since it is expected for guest visitors
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ username: data.user.username });
        return { success: true, user: data.user };
      } else {
        const msg = data.error || 'Login failed.';
        setError(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const errMsg = 'Network error during login.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, user: data.user };
      } else {
        const msg = data.error || 'Registration failed.';
        setError(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const errMsg = 'Network error during registration.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        return { success: true };
      } else {
        setError('Logout failed.');
        return { success: false };
      }
    } catch (err) {
      const errMsg = 'Network error during logout.';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkStatus,
    setError,
  };
}
