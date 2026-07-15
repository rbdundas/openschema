import { useState, useCallback } from 'react';

/**
 * Custom hook to simplify asynchronous network requests.
 * Exposes the response data, loading state, error, and an execution function.
 *
 * @param {string} [url] Default URL for the request
 * @param {Object} [options] Default request options (headers, method, etc.)
 * @returns {Object} Request status and execution trigger: { data, loading, error, execute }
 */
export default function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Memoize options to avoid extra renders when object references change.
  const serializedOptions = JSON.stringify(options);

  const execute = useCallback(async (customUrl = url, customOptions = {}) => {
    if (!customUrl) {
      console.warn('useFetch: No URL provided for execution');
      return { success: false, error: 'No URL provided' };
    }

    setLoading(true);
    setError(null);

    try {
      const mergedOptions = {
        ...JSON.parse(serializedOptions),
        ...customOptions,
        headers: {
          'Content-Type': 'application/json',
          ...(JSON.parse(serializedOptions).headers || {}),
          ...(customOptions.headers || {}),
        },
      };

      if (mergedOptions.body && typeof mergedOptions.body !== 'string') {
        mergedOptions.body = JSON.stringify(mergedOptions.body);
      }

      const response = await fetch(customUrl, mergedOptions);
      const contentType = response.headers.get('content-type');
      let result;

      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      if (response.ok) {
        setData(result);
        return { success: true, data: result };
      } else {
        const errorMsg = result?.error || `Request failed with status ${response.status}`;
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || 'Network request failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [url, serializedOptions]);

  return { data, loading, error, execute };
}
