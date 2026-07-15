import { useState, useCallback } from 'react';

/**
 * Custom hook to toggle a boolean state (e.g. modals, tabs, dropdowns, expand/collapse).
 *
 * @param {boolean} [initialValue=false] The initial state
 * @returns {[boolean, Function]} The current state and a function to toggle it (optionally takes a boolean to force state)
 */
export default function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback((forcedValue) => {
    setValue((prev) => (typeof forcedValue === 'boolean' ? forcedValue : !prev));
  }, []);

  return [value, toggle];
}
