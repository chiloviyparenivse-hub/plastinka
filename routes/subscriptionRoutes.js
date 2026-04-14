const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Получить информацию о подписке пользователя
router.get('/subscription/status', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT subscription_type, subscription_expires_at FROM users WHERE id = $1',
            [req.user.id]
        );
        
        const user = result.rows[0];
        const isPremium = user.subscription_type === 'premium' && 
                          (!user.subscription_expires_at || new Date(user.subscription_expires_at) > new Date());
        
        res.json({
            isPremium,
            type: user.subscription_type,
            expiresAt: user.subscription_expires_at,
            isExpired: user.subscription_expires_at ? new Date(user.subscription_expires_at) <= new Date() : false
        });
    } catch (error) {
        console.error('Ошибка получения статуса подписки:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Активация премиум подписки
router.post('/subscription/activate-premium', authMiddleware, async (req, res) => {
    try {
        const { durationMonths = 1 } = req.body;
        
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
        
        await db.query(
            `UPDATE users 
             SET subscription_type = 'premium', 
                 subscription_expires_at = $1 
             WHERE id = $2`,
            [expiresAt, req.user.id]
        );
        
        res.json({
            success: true,
            message: `Premium подписка активирована до ${expiresAt.toLocaleDateString()}`,
            expiresAt
        });
    } catch (error) {
        console.error('Ошибка активации подписки:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Отмена подписки
router.post('/subscription/cancel', authMiddleware, async (req, res) => {
    try {
        await db.query(
            `UPDATE users 
             SET subscription_type = 'free', 
                 subscription_expires_at = NULL 
             WHERE id = $1`,
            [req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Подписка отменена'
        });
    } catch (error) {
        console.error('Ошибка отмены подписки:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;