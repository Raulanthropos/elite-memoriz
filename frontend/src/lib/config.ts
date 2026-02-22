let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Fix for live demo: strip trailing /api if it exists in the production env variable
if (apiUrl.endsWith('/api/')) {
  apiUrl = apiUrl.slice(0, -5);
} else if (apiUrl.endsWith('/api')) {
  apiUrl = apiUrl.slice(0, -4);
}

if (apiUrl.includes('localhost') && window.location.hostname !== 'localhost') {
  apiUrl = apiUrl.replace('localhost', window.location.hostname);
}

export const API_URL = apiUrl;
