const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { generateOTP, sendOTPEmail } = require('../services/emailService');
require('dotenv').config();

class AuthController {
    // Отправить код на почту (регистрация или вход)
    async sendOTP(req, res) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ message: 'Email обязателен' });
            }
            
            // Проверяем, существует ли пользователь
            const userExists = await db.query(
                'SELECT id, nickname FROM users WHERE email = $1',
                [email]
            );
            
            // Генерируем код
            const code = generateOTP();
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 5);
            
            // Удаляем старые неиспользованные коды для этого email
            await db.query(
                `UPDATE otp_codes SET is_used = true 
                 WHERE email = $1 AND is_used = false`,
                [email]
            );
            
            // Сохраняем новый код в БД
            await db.query(
                `INSERT INTO otp_codes (email, code, expires_at) 
                 VALUES ($1, $2, $3)`,
                [email, code, expiresAt]
            );
            
            // Отправляем письмо
            const emailResult = await sendOTPEmail(email, code);
            
            if (!emailResult.success) {
                return res.status(500).json({ message: 'Не удалось отправить письмо' });
            }
            
            res.json({
                success: true,
                message: 'Код отправлен на почту',
                email,
                userExists: userExists.rows.length > 0
            });
            
        } catch (error) {
            console.error('Ошибка отправки кода:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
    
    // Проверить код и выполнить вход/регистрацию
    async verifyOTP(req, res) {
        try {
            const { email, code, nickname } = req.body;
            
            if (!email || !code) {
                return res.status(400).json({ message: 'Email и код обязательны' });
            }
            
            // Ищем код в БД
            const otpResult = await db.query(
                `SELECT * FROM otp_codes 
                 WHERE email = $1 AND code = $2 AND is_used = false 
                 ORDER BY id DESC LIMIT 1`,
                [email, code]
            );
            
            if (otpResult.rows.length === 0) {
                return res.status(400).json({ message: 'Неверный код' });
            }
            
            const otp = otpResult.rows[0];
            
            // Проверяем, не истек ли код
            if (new Date() > new Date(otp.expires_at)) {
                await db.query('UPDATE otp_codes SET is_used = true WHERE id = $1', [otp.id]);
                return res.status(400).json({ message: 'Код истек. Запросите новый.' });
            }
            
            // Помечаем код как использованный
            await db.query('UPDATE otp_codes SET is_used = true WHERE id = $1', [otp.id]);
            
            // Проверяем, существует ли пользователь
            const userResult = await db.query(
                'SELECT id, nickname, email, avatar_url, subscription_type, subscription_expires_at, created_at, is_admin FROM users WHERE email = $1',
                [email]
            );
            
            let user;
            let isNewUser = false;
            
            if (userResult.rows.length === 0) {
                // Новый пользователь - регистрируем
                if (!nickname) {
                    return res.status(400).json({ message: 'Для регистрации укажите никнейм' });
                }
                
                // НЕ проверяем никнейм на уникальность - можно повторять
                const newUserResult = await db.query(
                    `INSERT INTO users (nickname, email, is_verified) 
                     VALUES ($1, $2, true) 
                     RETURNING id, nickname, email, avatar_url, subscription_type, subscription_expires_at, created_at, is_admin`,
                    [nickname, email]
                );
                user = newUserResult.rows[0];
                isNewUser = true;
            } else {
                user = userResult.rows[0];
            }
            
            // Генерируем JWT токен
            const token = jwt.sign(
                { id: user.id, email: user.email, isAdmin: user.is_admin || false },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
            );
            
            res.json({
                success: true,
                message: isNewUser ? 'Регистрация успешна' : 'Вход выполнен',
                user,
                token,
                isNewUser
            });
            
        } catch (error) {
            console.error('Ошибка проверки кода:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
    
    // Получение профиля текущего пользователя
    async getProfile(req, res) {
        try {
            const user = await db.query(
                'SELECT id, nickname, email, avatar_url, subscription_type, subscription_expires_at, created_at, is_admin FROM users WHERE id = $1',
                [req.user.id]
            );
            
            if (user.rows.length === 0) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            
            res.json(user.rows[0]);
        } catch (error) {
            console.error('Ошибка получения профиля:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
    
    // Обновление профиля (с поддержкой Volume для аватаров)
    async updateProfile(req, res) {
        try {
            const { nickname } = req.body;
            const userId = req.user.id;
            
            const updateData = {};
            if (nickname) updateData.nickname = nickname;
            
            // Если загружен аватар
            if (req.file) {
                // Определяем путь для загрузки в зависимости от окружения
                const isProduction = process.env.NODE_ENV === 'production';
                const uploadsDir = isProduction ? '/app/uploads' : 'uploads';
                
                updateData.avatar_url = `${uploadsDir}/avatars/${req.file.filename}`;
                console.log('Аватар сохранен:', updateData.avatar_url);
            }
            
            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ message: 'Нет данных для обновления' });
            }
            
            // НЕ проверяем никнейм на уникальность
            const query = `
                UPDATE users 
                SET nickname = COALESCE($1, nickname),
                    avatar_url = COALESCE($2, avatar_url),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING id, nickname, email, avatar_url, subscription_type, subscription_expires_at, created_at, is_admin
            `;
            
            const result = await db.query(query, [updateData.nickname, updateData.avatar_url, userId]);
            
            res.json({
                message: 'Профиль обновлен',
                user: result.rows[0]
            });
            
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            res.status(500).json({ message: 'Ошибка сервера: ' + error.message });
        }
    }
}

module.exports = new AuthController();