export const API_BASE = window.location.origin.includes('localhost:') && !window.location.origin.includes(':8008')
  ? 'http://localhost:8008/api'
  : '/api';
