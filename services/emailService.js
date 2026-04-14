// services/emailService.js

const https = require('https');
const querystring = require('querystring');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, code) => {
    const apiKey = '6t94hoxghucctu46ag1hs7hgeex85hc5hmsggkba';
    
    const htmlContent = `
        <h1>Пластинка</h1>
        <p>Ваш код подтверждения: <strong style="font-size: 24px;">${code}</strong></p>
        <p>Код действителен 5 минут.</p>
    `;

    // Другой формат - используем email как параметр
    const postData = querystring.stringify({
        format: 'json',
        api_key: apiKey,
        email: email,  // вместо recipients
        sender_name: 'Пластинка',
        sender_email: 'alexeypntlv@yandex.ru',
        subject: 'Код подтверждения - Пластинка',
        body: htmlContent
    });

    const options = {
        hostname: 'api.unisender.com',
        path: '/ru/api/sendEmail',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('Unisender ответ:', result);
                    
                    if (result.result) {
                        resolve({ success: true });
                    } else {
                        resolve({ success: false, error: result.error });
                    }
                } catch (e) {
                    resolve({ success: false, error: e.message });
                }
            });
        });

        req.on('error', (error) => {
            resolve({ success: false, error: error.message });
        });

        req.write(postData);
        req.end();
    });
};

module.exports = { generateOTP, sendOTPEmail };