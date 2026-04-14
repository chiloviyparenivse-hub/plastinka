// services/emailService.js

// Генерация 6-значного кода
const generateOTP = () => {
    return Math.floor(100000 + Math.random()  * 900000).toString();
};

// Отправка кода через API Unisender
const sendOTPEmail = async (email, code) => {
    const apiKey = '6t94hoxghucctu46ag1hs7hgeex85hc5hmsggkba';
    const apiUrl = 'https://api.unisender.com/ru/api/sendEmail?format=json&api_key=' + apiKey;

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
                    <p>Ваш код подтверждения</p>
                </div>
                <div style="text-align: center;">
                    <div class="code">${code}</div>
                    <p style="margin-top: 20px;">Код действителен в течение 5 минут.</p>
                    <p>Если вы не запрашивали этот код, просто проигнорируйте письмо.</p>
                </div>
                <div class="footer">
                    <p>© 2026 Пластинка. Все права защищены.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Формируем параметры запроса
    const params = new URLSearchParams();
    params.append('format', 'json');
    params.append('api_key', apiKey);
    params.append('sender_name', 'Пластинка');
    params.append('sender_email', 'alexeypntlv@yandex.ru');
    params.append('subject', 'Код подтверждения - Пластинка');
    params.append('body', htmlContent);
    params.append('list_id', '1');
    params.append('recipients', JSON.stringify([{ email: email }]));

    try {
        console.log(`📧 Отправка кода ${code} на ${email} через Unisender...`);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });

        const result = await response.json();
        console.log('Ответ Unisender:', result);

        if (result.result && result.result.email) {
            console.log(`✅ Письмо успешно отправлено! ID: ${result.result.email}`);
            return { success: true };
        } else if (result.error) {
            console.error('❌ Ошибка Unisender:', result.error);
            return { success: false, error: result.error };
        } else {
            console.error('❌ Неизвестная ошибка:', result);
            return { success: false, error: 'Неизвестная ошибка' };
        }

    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { generateOTP, sendOTPEmail };