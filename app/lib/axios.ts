import axios from 'axios';

const api = axios.create({
    baseURL: 'https://api.pinangmajusejahtera.my.id',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

export default api;