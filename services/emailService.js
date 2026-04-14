// services/emailService.js
const https = require('https');

const API_TOKEN = '7b85c671c8e3fe9f45d128970cfa6815';
const API_BASE_URL = 'https://api.notisend.ru/v1';

// Генерация 6-значного кода
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Отправка кода через API NotiSend
const sendOTPEmail = async (email, code) => {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
                .code { 
                    font-size: 36px; 
                    font-weight: bold; 
                    letter-spacing: 5px; 
                    padding: 15px; 
                    background: #f3f4f6; 
                    border-radius: 10px; 
                    display: inline-block;
                    color: #667eea;
                }
                .footer { margin-top: 30px; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 style="color: #667eea;">🎵 Пластинка</h1>
                <p>Ваш код подтверждения:</p>
                <div class="code">${code}</div>
                <p>Код действителен в течение 5 минут.</p>
                <div class="footer">
                    <p>© 2024 Пластинка</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const postData = JSON.stringify({
        from_email: 'alexeypntlv@yandex.ru',
        from_name: 'Пластинка',
        to: email,
        subject: 'Код подтверждения - Пластинка',
        html: htmlContent,
        text: `Ваш код подтверждения: ${code}. Код действителен 5 минут.`,
        payment: 'credit_priority'  // используем кредиты в первую очередь
    });

    const options = {
        hostname: 'api.notisend.ru',
        path: '/v1/email/messages',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
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
                    console.log('NotiSend ответ:', result);
                    
                    if (result.id || (result.status && result.status !== 'error')) {
                        console.log(`✅ Письмо отправлено! ID: ${result.id || 'unknown'}`);
                        resolve({ success: true });
                    } else if (result.errors) {
                        console.error('❌ Ошибка NotiSend:', result.errors);
                        resolve({ success: false, error: result.errors[0]?.detail || 'Unknown error' });
                    } else {
                        resolve({ success: false, error: 'Неизвестная ошибка' });
                    }
                } catch (e) {
                    console.error('❌ Ошибка парсинга ответа:', e);
                    resolve({ success: false, error: e.message });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Ошибка запроса:', error);
            resolve({ success: false, error: error.message });
        });

        req.write(postData);
        req.end();
    });
};

module.exports = { generateOTP, sendOTPEmail };