const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function run() {
    try {
        console.log("1. Create a dummy jpeg image...");
        const buf = Buffer.from(
            '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
            'base64'
        );
        fs.writeFileSync('dummy.jpg', buf);

        console.log("2. Login to mobile endpoint...");
        const loginRes = await axios.post('http://127.0.0.1:8000/api/mobile/login', {
            email: 'budi@kanvas.id',
            password: 'password'
        }, {
            headers: {
                'Accept': 'application/json'
            }
        });

        const token = loginRes.data.token;
        console.log("Token received:", token);

        console.log("3. Uploading closed photo for Outlet 9 (Apotek Sehat Bersama)...");
        const form = new FormData();
        form.append('note', 'Toko tutup, sedang libur');
        form.append('photo', fs.createReadStream('dummy.jpg'));

        const uploadRes = await axios.post('http://127.0.0.1:8000/api/mobile/outlets/9/closed-photo', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        console.log("Upload Success:", uploadRes.data);

        // cleanup
        fs.unlinkSync('dummy.jpg');
    } catch (err) {
        console.error("Error occurred:", err.response ? err.response.data : err.message);
    }
}

run();
