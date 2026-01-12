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
  // 1. L'URL de ton backend déployé sur Vercel (plus de localhost !)
  apiUrl: 'https://urbanspot2025.vercel.app',
  
  // 2. Ta clé API secrète (récupérée de ton fichier .env)
  apiKey: 'some-secret-key-1203092ejrfmwps;dklnmc'
};

