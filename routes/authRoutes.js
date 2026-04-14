const express = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const authController = require('../controllers/authController');
const { uploadAvatar } = require('../middleware/upload');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();

// ==================== OTP МАРШРУТЫ ====================
router.post('/send-otp',
    [
        body('email').isEmail().withMessage('Введите корректный email')
    ],
    authController.sendOTP
);

router.post('/verify-otp',
    [
        body('email').isEmail().withMessage('Введите корректный email'),
        body('code').isLength({ min: 6, max: 6 }).withMessage('Код должен быть 6 символов')
    ],
    authController.verifyOTP
);

// ==================== ВХОД ДЛЯ АДМИНКИ (по паролю) ====================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Попытка входа в админку:', email);
        
        // Ищем пользователя в таблице users, который является админом
        const userResult = await db.query(
            'SELECT * FROM users WHERE email = $1 AND is_admin = true',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ Админ не найден:', email);
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }
        
        const user = userResult.rows[0];
        
        // Проверяем пароль
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            console.log('❌ Неверный пароль для:', email);
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }
        
        // Генерируем токен
        const token = jwt.sign(
            { id: user.id, email: user.email, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
        
        console.log('✅ Админ вошел:', email);
        
        res.json({
            message: 'Вход выполнен',
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                nickname: user.nickname,
                isAdmin: true 
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка входа в админку:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// ==================== ПРОФИЛЬ ====================
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, uploadAvatar.single('avatar'), authController.updateProfile);

module.exports = router;