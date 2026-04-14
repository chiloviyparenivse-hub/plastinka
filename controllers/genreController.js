const db = require('../config/database');

const FREE_GENRES = ['Рок', 'Поп', 'Электроника', 'Джаз', 'Классика'];

class GenreController {
    // Для неавторизованных пользователей - только 5 жанров
    async getPublicGenres(req, res) {
        try {
            const result = await db.query(
                'SELECT * FROM genres WHERE name = ANY($1) ORDER BY name',
                [FREE_GENRES]
            );
            console.log(`Публичный запрос: ${result.rows.length} жанров`);
            res.json(result.rows);
        } catch (error) {
            console.error('Ошибка получения публичных жанров:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Для авторизованных пользователей - в зависимости от подписки
    async getAllGenres(req, res) {
        try {
            // Пользователь авторизован (authMiddleware уже отработал)
            const isPremium = req.user.subscription_type === 'premium';
            const isNotExpired = !req.user.subscription_expires_at || new Date(req.user.subscription_expires_at) > new Date();
            
            if (isPremium && isNotExpired) {
                const result = await db.query('SELECT * FROM genres ORDER BY name');
                console.log(`Premium ${req.user.email}: ${result.rows.length} жанров`);
                return res.json(result.rows);
            } else {
                const result = await db.query(
                    'SELECT * FROM genres WHERE name = ANY($1) ORDER BY name',
                    [FREE_GENRES]
                );
                console.log(`Free ${req.user.email}: ${result.rows.length} жанров`);
                return res.json(result.rows);
            }
            
        } catch (error) {
            console.error('Ошибка получения жанров:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Создать новый жанр (только админ)
    async createGenre(req, res) {
        try {
            const { key, name, description } = req.body;
            
            if (!key || !name) {
                return res.status(400).json({ message: 'Ключ и название жанра обязательны' });
            }

            // Проверяем, существует ли уже такой ключ
            const existingByKey = await db.query(
                'SELECT id FROM genres WHERE key = $1',
                [key.toLowerCase()]
            );
            
            if (existingByKey.rows.length > 0) {
                return res.status(400).json({ message: 'Жанр с таким ключом уже существует' });
            }

            // Проверяем, существует ли уже такое название
            const existingByName = await db.query(
                'SELECT id FROM genres WHERE name = $1',
                [name]
            );
            
            if (existingByName.rows.length > 0) {
                return res.status(400).json({ message: 'Жанр с таким названием уже существует' });
            }

            const result = await db.query(
                'INSERT INTO genres (key, name, description) VALUES ($1, $2, $3) RETURNING *',
                [key.toLowerCase(), name, description || '']
            );
            
            console.log(`Создан жанр: ${name} (key: ${key})`);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Ошибка создания жанра:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Обновить жанр (только админ)
    async updateGenre(req, res) {
        try {
            const { id } = req.params;
            const { key, name, description } = req.body;
            
            // Проверяем, не занят ли ключ другим жанром
            if (key) {
                const existingByKey = await db.query(
                    'SELECT id FROM genres WHERE key = $1 AND id != $2',
                    [key.toLowerCase(), id]
                );
                
                if (existingByKey.rows.length > 0) {
                    return res.status(400).json({ message: 'Жанр с таким ключом уже существует' });
                }
            }
            
            // Проверяем, не занято ли название другим жанром
            if (name) {
                const existingByName = await db.query(
                    'SELECT id FROM genres WHERE name = $1 AND id != $2',
                    [name, id]
                );
                
                if (existingByName.rows.length > 0) {
                    return res.status(400).json({ message: 'Жанр с таким названием уже существует' });
                }
            }
            
            const result = await db.query(
                `UPDATE genres 
                 SET key = COALESCE($1, key),
                     name = COALESCE($2, name),
                     description = COALESCE($3, description)
                 WHERE id = $4 
                 RETURNING *`,
                [key ? key.toLowerCase() : null, name, description || '', id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Жанр не найден' });
            }
            
            console.log(`Обновлен жанр: ${result.rows[0].name} (key: ${result.rows[0].key})`);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Ошибка обновления жанра:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Удалить жанр (только админ)
    async deleteGenre(req, res) {
        try {
            const { id } = req.params;
            
            const tracksCheck = await db.query(
                'SELECT COUNT(*) FROM tracks WHERE genre_id = $1',
                [id]
            );
            
            if (parseInt(tracksCheck.rows[0].count) > 0) {
                return res.status(400).json({ 
                    message: 'Нельзя удалить жанр, в котором есть треки' 
                });
            }
            
            const result = await db.query('DELETE FROM genres WHERE id = $1 RETURNING *', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Жанр не найден' });
            }
            
            console.log(`Удален жанр: ${result.rows[0].name}`);
            res.json({ message: 'Жанр удален' });
        } catch (error) {
            console.error('Ошибка удаления жанра:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new GenreController();