const nodemailer = require('nodemailer');

// ВНИМАНИЕ: Unisender Go использует API, а не SMTP
// Этот файл больше не нужен для отправки писем, но оставим для совместимости
// Фактическая отправка будет через API в emailService.js

// Генерация 6-значного кода
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Функция-заглушка, реальная отправка в emailService.js
const sendOTPEmail = async (email, code) => {
    console.log(`⚠️ Используйте emailService.js для отправки через Unisender API`);
    console.log(`📧 [ТЕСТ] Код для ${email}: ${code}`);
    return { success: true };
};

module.exports = { generateOTP, sendOTPEmail };