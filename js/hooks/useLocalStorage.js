import { useState, useEffect } from 'react';

/**
 * Custom hook to manage state synchronized with localStorage.
 * Useful for prototyping UI elements where user inputs/preferences need to persist across page loads.
 *
 * @param {string} key The key under which the value is stored in localStorage
 * @param {*} initialValue The default value if no value exists in localStorage yet
 * @returns {[*, Function]} A stateful value and a function to update it
 */
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
