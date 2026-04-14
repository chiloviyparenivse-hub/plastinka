const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Пожалуйста, авторизуйтесь' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Получаем пользователя из БД
        const userResult = await db.query(
            'SELECT id, email, nickname, avatar_url, subscription_type, subscription_expires_at, is_admin FROM users WHERE id = $1',
            [decoded.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Пользователь не найден' });
        }
        
        const user = userResult.rows[0];
        
        req.user = {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            subscription_type: user.subscription_type,
            subscription_expires_at: user.subscription_expires_at,
            isAdmin: user.is_admin || false
        };
        
        console.log(`Auth: ${user.email}, subscription_type: ${user.subscription_type}, isAdmin: ${user.is_admin}`);
        
        next();
    } catch (error) {
        console.log('Auth middleware error:', error.message);
        res.status(401).json({ message: 'Пожалуйста, авторизуйтесь' });
    }
};

// Middleware для проверки роли администратора
const adminMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Пожалуйста, авторизуйтесь' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Проверка админа для:', decoded.email);
        
        // Получаем пользователя из таблицы users
        const userResult = await db.query(
            'SELECT id, email, nickname, is_admin FROM users WHERE id = $1',
            [decoded.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Пользователь не найден' });
        }
        
        const user = userResult.rows[0];
        
        // Проверяем, является ли пользователь администратором
        if (!user.is_admin) {
            console.log('Доступ запрещен: пользователь не является админом', decoded.email);
            return res.status(403).json({ 
                message: 'Доступ запрещен. Только для администраторов'
            });
        }
        
        console.log('Админ доступ разрешен:', decoded.email);
        
        req.user = {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            isAdmin: true
        };
        
        next();
    } catch (error) {
        console.log('Admin middleware error:', error.message);
        return res.status(401).json({ message: 'Ошибка авторизации' });
    }
};

module.exports = { authMiddleware, adminMiddleware };