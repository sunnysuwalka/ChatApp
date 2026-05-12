import axios from 'axios';

const api = axios.create({
<<<<<<< HEAD
  baseURL: 'http://localhost:5000/api',
=======
  baseURL: process.env.REACT_APP_API_URL,
>>>>>>> temp-main
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
