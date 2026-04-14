const db = require('../config/database');

class GenreModel {
    // Получить все жанры
    async findAll() {
        const query = 'SELECT * FROM genres ORDER BY name';
        const result = await db.query(query);
        return result.rows;
    }

    // Получить жанр по ID
    async findById(id) {
        const query = 'SELECT * FROM genres WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // Создать новый жанр (для админа)
    async create(genreData) {
        const { name, description } = genreData;
        const query = `
            INSERT INTO genres (name, description)
            VALUES ($1, $2)
            RETURNING *
        `;
        const result = await db.query(query, [name, description]);
        return result.rows[0];
    }

    // Обновить жанр (для админа)
    async update(id, genreData) {
        const { name, description } = genreData;
        const query = `
            UPDATE genres
            SET name = COALESCE($1, name),
                description = COALESCE($2, description)
            WHERE id = $3
            RETURNING *
        `;
        const result = await db.query(query, [name, description, id]);
        return result.rows[0];
    }

    // Удалить жанр (для админа)
    async delete(id) {
        // Проверяем, есть ли треки с этим жанром
        const checkQuery = 'SELECT COUNT(*) FROM tracks WHERE genre_id = $1';
        const checkResult = await db.query(checkQuery, [id]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            throw new Error('Cannot delete genre with existing tracks');
        }

        const query = 'DELETE FROM genres WHERE id = $1 RETURNING id';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = new GenreModel();