// services/emailService.js

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, code) => {
    const proxyUrl = process.env.VERCEL_EMAIL_PROXY_URL;
    
    if (!proxyUrl) {
        console.error('❌ VERCEL_EMAIL_PROXY_URL не задан');
        return { success: false, error: 'Proxy URL not configured' };
    }

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

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: email,
                subject: 'Код подтверждения - Пластинка',
                html: htmlContent,
            })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log(`✅ Письмо отправлено через Vercel прокси на ${email}`);
            return { success: true };
        } else {
            console.error('❌ Ошибка Vercel прокси:', result);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('❌ Ошибка запроса к Vercel:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { generateOTP, sendOTPEmail };