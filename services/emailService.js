// services/emailService.js

const https = require('https');
const querystring = require('querystring');

// Генерация 6-значного кода
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Отправка кода через API Unisender
const sendOTPEmail = async (email, code) => {
    const apiKey = '6t94hoxghucctu46ag1hs7hgeex85hc5hmsggkba';
    
    // Формируем HTML письма
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .code { 
                    font-size: 36px; 
                    font-weight: bold; 
                    letter-spacing: 5px; 
                    padding: 15px; 
                    background: #f0f0f0; 
                    border-radius: 10px; 
                    display: inline-block;
                    color: #667eea;
                }
                .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="color: #667eea;">🎵 Пластинка</h1>
                    <p>Ваш код подтверждения</p>
                </div>
                <div style="text-align: center;">
                    <div class="code">${code}</div>
                    <p style="margin-top: 20px;">Код действителен в течение 5 минут.</p>
                    <p>Если вы не запрашивали этот код, просто проигнорируйте письмо.</p>
                </div>
                <div class="footer">
                    <p>© 2024 Пластинка. Все права защищены.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Правильный формат параметров для Unisender API
    const postData = querystring.stringify({
        format: 'json',
        api_key: apiKey,
        sender_name: 'Пластинка',
        sender_email: 'alexeypntlv@yandex.ru',
        subject: 'Код подтверждения - Пластинка',
        body: htmlContent,
        recipients: email  // Просто email, без JSON массива!
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
                    console.log('Ответ Unisender:', result);
                    
                    if (result.result && result.result.email) {
                        console.log(`✅ Письмо успешно отправлено! ID: ${result.result.email}`);
                        resolve({ success: true });
                    } else if (result.error) {
                        console.error('❌ Ошибка Unisender:', result.error);
                        resolve({ success: false, error: result.error });
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