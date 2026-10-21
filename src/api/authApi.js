import httpClient from './httpClient';

export function login(payload) {
  return httpClient.post('/api/auth/login', payload).then((res) => res.data);
}

export function refresh(refreshToken) {
  return httpClient.post('/api/auth/refresh', { refreshToken }).then((res) => res.data);
}

export function logout(refreshToken) {
  return httpClient.post('/api/auth/logout', { refreshToken }).then((res) => res.data);
}

export function changePassword(payload) {
  return httpClient.put('/api/auth/change-password', payload).then((res) => res.data);
}
