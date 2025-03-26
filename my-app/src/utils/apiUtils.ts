// utils/apiUtils.ts
import { createClient } from '@/utils/supabase/client';

/**
 * Standard response format for all API operations
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Wraps a function that returns a promise in a try-catch block
 * and returns a standardized API response
 */
export const wrapApiCall = async <T>(
  operation: () => Promise<T>
): Promise<ApiResponse<T>> => {
  try {
    const result = await operation();
    return {
      data: result,
      error: null,
      status: 200
    };
  } catch (error: any) {
    console.error('API Error:', error);
    return {
      data: null,
      error: error.message || 'An unexpected error occurred',
      status: error.status || 500
    };
  }
};

/**
 * Creates a debounced function
 * Useful for search inputs or other frequently changing values
 */
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};

/**
 * Creates a throttled function
 * Useful for actions that should be limited, like button clicks
 */
export const throttle = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let lastTime = 0;

  const throttled = (...args: Parameters<F>) => {
    const now = Date.now();
    if (now - lastTime >= waitFor) {
      func(...args);
      lastTime = now;
    }
  };

  return throttled as (...args: Parameters<F>) => ReturnType<F>;
};

/**
 * Local storage utility to cache API responses
 */
export const cacheUtils = {
  set: (key: string, data: any, expirationMinutes = 5) => {
    const item = {
      data,
      expiry: new Date(new Date().getTime() + expirationMinutes * 60000)
    };
    localStorage.setItem(key, JSON.stringify(item));
  },
  
  get: <T>(key: string): T | null => {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    const now = new Date();
    
    if (now > new Date(item.expiry)) {
      localStorage.removeItem(key);
      return null;
    }
    
    return item.data as T;
  },
  
  clear: (key: string) => {
    localStorage.removeItem(key);
  }
};