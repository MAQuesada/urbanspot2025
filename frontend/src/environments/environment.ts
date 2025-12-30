/**
 * Environment configuration for local development
 * 
 * IMPORTANT: You must set the apiKey to match the API_KEY in your backend .env file
 * 
 * To configure:
 * 1. Check your backend/.env file for the API_KEY value
 * 2. Set the same value here in apiKey
 * 
 * Example:
 * If your backend .env has: API_KEY=my-secret-key-123
 * Then set: apiKey: 'my-secret-key-123'
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  // TODO: Set your API key here - must match the API_KEY in backend/.env
  apiKey: ''
};

