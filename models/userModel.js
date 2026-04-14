const db = require('../config/database');

class UserModel {
    // Создание нового пользователя
    async create(userData) {
        const { nickname, email, password_hash, avatar_url } = userData;
        const query = `
            INSERT INTO users (nickname, email, password_hash, avatar_url)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nickname, email, avatar_url, created_at
        `;
        const values = [nickname, email, password_hash, avatar_url || null];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Поиск пользователя по email
    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await db.query(query, [email]);
        return result.rows[0];
    }

    // Поиск пользователя по ID
    async findById(id) {
        const query = `
            SELECT id, nickname, email, avatar_url, created_at, updated_at
            FROM users 
            WHERE id = $1
        `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // Поиск пользователя с паролем (для смены пароля)
    async findByIdWithPassword(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // Обновление профиля пользователя
    async updateProfile(id, updateData) {
        const { nickname, avatar_url } = updateData;
        const query = `
            UPDATE users 
            SET nickname = COALESCE($1, nickname),
                avatar_url = COALESCE($2, avatar_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id, nickname, email, avatar_url, updated_at
        `;
        const result = await db.query(query, [nickname, avatar_url, id]);
        return result.rows[0];
    }

    // Обновление пароля
    async updatePassword(id, password_hash) {
        const query = `
            UPDATE users 
            SET password_hash = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id
        `;
        const result = await db.query(query, [password_hash, id]);
        return result.rows[0];
    }

    // Добавить любимые жанры пользователя
    async addFavoriteGenres(userId, genreIds) {
        // Сначала удаляем старые
        await db.query('DELETE FROM user_favorite_genres WHERE user_id = $1', [userId]);
        
        // Добавляем новые
        if (genreIds && genreIds.length > 0) {
            const values = genreIds.map(genreId => `(${userId}, ${genreId})`).join(',');
            const query = `
                INSERT INTO user_favorite_genres (user_id, genre_id)
                VALUES ${values}
            `;
            await db.query(query);
        }
        
        // Возвращаем обновленный список
        return this.getFavoriteGenres(userId);
    }

    // Получить любимые жанры пользователя
    async getFavoriteGenres(userId) {
        const query = `
            SELECT g.* 
            FROM genres g
            JOIN user_favorite_genres ufg ON g.id = ufg.genre_id
            WHERE ufg.user_id = $1
            ORDER BY g.name
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }
}

module.exports = new UserModel();