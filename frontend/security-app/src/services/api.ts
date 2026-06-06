const API_BASE = 'http://10.10.100.39:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('vms_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const api = {
  // Auth
  login: (credentials: any) => fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  }).then(res => {
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  }),

  // Check-ins
  getCheckins: () => fetch(`${API_BASE}/checkins`, { headers: getHeaders() }).then(res => res.json()),
  getCheckoutRequests: () => fetch(`${API_BASE}/checkout-requests`, { headers: getHeaders() }).then(res => res.json()),
  approveCheckin: (id: number) => fetch(`${API_BASE}/checkins/${id}/approve`, {
    method: 'PUT',
    headers: getHeaders()
  }).then(res => res.json()),
  rejectCheckin: (id: number, reason?: string) => fetch(`${API_BASE}/checkins/${id}/reject`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ reason: reason || '' })
  }).then(res => res.json()),

  // Active Visitors
  getActive: () => fetch(`${API_BASE}/active`, { headers: getHeaders() }).then(res => res.json()),
  checkoutVisitor: (id: number) => fetch(`${API_BASE}/active/${id}/checkout`, {
    method: 'PUT',
    headers: getHeaders()
  }).then(res => res.json()),

  // History
  getHistory: () => fetch(`${API_BASE}/history`, { headers: getHeaders() }).then(res => res.json()),

  // System
  resetSystem: () => fetch(`${API_BASE}/reset`, {
    method: 'POST',
    headers: getHeaders()
  }).then(res => res.json())
};
