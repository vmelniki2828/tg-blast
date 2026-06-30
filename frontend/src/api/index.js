import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Contacts
export const getContacts = (params) => api.get('/contacts', { params });
export const createContact = (data) => api.post('/contacts', data);
export const updateContact = (id, data) => api.put(`/contacts/${id}`, data);
export const deleteContact = (id) => api.delete(`/contacts/${id}`);
export const getTags = () => api.get('/contacts/tags');

// Campaigns
export const getCampaigns = () => api.get('/campaigns');
export const createCampaign = (data) => api.post('/campaigns', data);
export const cancelCampaign = (id) => api.delete(`/campaigns/${id}`);

// Logs
export const getLogs = (params) => api.get('/logs', { params });

// Telegram
export const getBotStatus = () => api.get('/telegram/status');
export const sendTestMessage = (data) => api.post('/telegram/test', data);

// WhatsApp
export const getWaStatus = () => api.get('/whatsapp/status');
export const getWaQr = () => api.get('/whatsapp/qr');
export const sendWaTest = (data) => api.post('/whatsapp/test', data);
export const waLogout = () => api.post('/whatsapp/logout');
export const waReconnect = () => api.post('/whatsapp/reconnect');
