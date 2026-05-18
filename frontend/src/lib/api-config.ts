/**
 * API Configuration
 * Central configuration for API endpoints
 */

// Get API URL from environment variable or default to Next.js API routes
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Check if using external backend
export const IS_EXTERNAL_API = !!process.env.NEXT_PUBLIC_API_URL;

console.log('[API Config] Using API URL:', API_URL);
console.log('[API Config] External API:', IS_EXTERNAL_API);
