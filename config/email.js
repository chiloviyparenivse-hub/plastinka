const nodemailer = require('nodemailer');

// Настройки для Яндекс почты (порт 587)
const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 30000,  // 30 секунд
    greetingTimeout: 30000,     // 30 секунд
    socketTimeout: 30000        // 30 секунд
});

// Проверка подключения
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Ошибка подключения к SMTP Яндекс:', error.message);
        console.error('📧 EMAIL_USER:', process.env.EMAIL_USER);
        console.error('🔑 EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***установлен***' : 'не установлен');
    } else {
        console.log('✅ SMTP Яндекс готов к отправке писем');
    }
});

// Генерация 6-значного кода
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Отправка кода подтверждения
const sendOTPEmail = async (email, code) => {
    try {
        console.log(`📧 Попытка отправки письма на ${email}`);
        
        const mailOptions = {
            from: `"Пластинка" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Код подтверждения - Пластинка',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 15px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                            <span style="font-size: 30px;">🎵</span>
                        </div>
                        <h1 style="color: #fff; margin: 0;">Пластинка</h1>
                        <p style="color: rgba(255,255,255,0.6); margin-top: 5px;">Ваш код подтверждения</p>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; text-align: center;">
                        <p style="color: rgba(255,255,255,0.8); margin-bottom: 20px;">Для продолжения введите код:</p>
                        <div style="background: rgba(102,126,234,0.2); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                            <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #667eea;">${code}</span>
                        </div>
                        <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0;">
                            Код действителен в течение 5 минут.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <p style="color: rgba(255,255,255,0.3); font-size: 11px;">
                            Если вы не запрашивали этот код, просто проигнорируйте это письмо.
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Письмо отправлено на ${email}`);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Ошибка отправки письма:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { generateOTP, sendOTPEmail };