let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

if (apiUrl.includes('localhost') && window.location.hostname !== 'localhost') {
  apiUrl = apiUrl.replace('localhost', window.location.hostname);
}

export const API_URL = apiUrl;
