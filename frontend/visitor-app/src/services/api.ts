const API_BASE = 'http://10.10.100.39:5000/api';

export const api = {
  // Visitors only need to submit check-in requests
  submitCheckin: (data: any) => fetch(`${API_BASE}/checkins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: data.name,
      id_number: data.idNumber,
      contact_number: data.contact,
      vehicle_plate: data.plate,
      image_base64: data.image,
      person_to_meet: data.person,
      reason: data.reason
    })
  }).then(res => {
    if (!res.ok) throw new Error('Submission failed');
    return res.json();
  }),
  getVisitStatus: (id: string) => fetch(`${API_BASE}/checkins/${id}/status`).then(res => {
    if (!res.ok) throw new Error('Status check failed');
    return res.json();
  }),
  requestCheckout: (id: string) => fetch(`${API_BASE}/checkins/${id}/request-checkout`, {
    method: 'PUT'
  }).then(res => res.json()),
  searchVisitor: (idNumber: string) => fetch(`${API_BASE}/search-visitor/${idNumber}`).then(res => {
    if (!res.ok) throw new Error('Visitor not found');
    return res.json();
  })
};
