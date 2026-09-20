export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '/api';
};

export const getWebSocketUrl = (): string => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  
  // In local dev mode or when frontend runs on dev ports (5173, 5174, 5175, etc.), connect directly to backend port 8088
  if (import.meta.env.DEV || (window.location.port && window.location.port !== '8088')) {
    return `${protocol}//${host}:8088/ws/chat`;
  }
  
  const port = window.location.port ? `:${window.location.port}` : '';
  return `${protocol}//${host}${port}/ws/chat`;
};
