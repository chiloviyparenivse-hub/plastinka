const db = require('../config/database');

// Основные жанры для бесплатных пользователей
const FREE_GENRES = ['Рок', 'Поп', 'Электроника', 'Джаз', 'Классика'];

// Проверка подписки пользователя
const checkSubscription = async (userId) => {
    const result = await db.query(
        `SELECT subscription_type, subscription_expires_at 
         FROM users WHERE id = $1`,
        [userId]
    );
    
    const user = result.rows[0];
    if (!user) return { isPremium: false, maxMinutes: 180, availableGenres: FREE_GENRES };
    
    const isPremium = user.subscription_type === 'premium' && 
                      (!user.subscription_expires_at || new Date(user.subscription_expires_at) > new Date());
    
    console.log(`Пользователь ${userId}: подписка ${user.subscription_type}, isPremium: ${isPremium}`);
    
    return {
        isPremium,
        maxMinutes: isPremium ? 1440 : 180,
        availableGenres: isPremium ? null : FREE_GENRES
    };
};

// Middleware для проверки при создании плейлиста
const validatePlaylistLimits = async (req, res, next) => {
    try {
        const { genre_id, target_minutes, blocks } = req.body;
        const userId = req.user.id;
        
        const subscription = await checkSubscription(userId);
        
        // Проверка длительности
        let totalMinutes = 0;
        if (blocks) {
            totalMinutes = blocks.reduce((sum, b) => sum + b.target_minutes, 0);
        } else {
            totalMinutes = target_minutes;
        }
        
        if (totalMinutes > subscription.maxMinutes) {
            return res.status(403).json({ 
                message: `Бесплатная версия ограничена ${subscription.maxMinutes} минутами. Оформите подписку Premium для создания плейлистов до 24 часов.`,
                needPremium: true,
                currentLimit: subscription.maxMinutes
            });
        }
        
        // Проверка жанра для бесплатных пользователей
        if (!subscription.isPremium && !blocks) {
            const genreResult = await db.query('SELECT name FROM genres WHERE id = $1', [genre_id]);
            const genreName = genreResult.rows[0]?.name;
            
            if (genreName && !FREE_GENRES.includes(genreName)) {
                return res.status(403).json({
                    message: `Жанр "${genreName}" доступен только в Premium версии. Оформите подписку для доступа ко всем жанрам.`,
                    needPremium: true,
                    availableGenres: FREE_GENRES
                });
            }
        } else if (!subscription.isPremium && blocks) {
            for (const block of blocks) {
                const genreResult = await db.query('SELECT name FROM genres WHERE id = $1', [block.genre_id]);
                const genreName = genreResult.rows[0]?.name;
                
                if (genreName && !FREE_GENRES.includes(genreName)) {
                    return res.status(403).json({
                        message: `Жанр "${genreName}" доступен только в Premium версии. Оформите подписку для доступа ко всем жанрам.`,
                        needPremium: true,
                        availableGenres: FREE_GENRES
                    });
                }
            }
        }
        
        req.subscription = subscription;
        next();
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

module.exports = { checkSubscription, validatePlaylistLimits, FREE_GENRES };