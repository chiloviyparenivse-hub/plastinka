const db = require('../config/database');

class TrackModel {
    // Получить все треки (с фильтрацией по жанру)
    async findAll(filters = {}) {
        let query = `
            SELECT t.*, g.name as genre_name 
            FROM tracks t
            JOIN genres g ON t.genre_id = g.id
        `;
        const values = [];
        
        if (filters.genre_id) {
            query += ` WHERE t.genre_id = $1`;
            values.push(filters.genre_id);
        }
        
        query += ` ORDER BY t.created_at DESC`;
        
        const result = await db.query(query, values);
        return result.rows;
    }

    // Найти трек по ID
    async findById(id) {
        const query = `
            SELECT t.*, g.name as genre_name 
            FROM tracks t
            JOIN genres g ON t.genre_id = g.id
            WHERE t.id = $1
        `;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // Получить треки по жанру (для алгоритма подбора)
    async findByGenre(genreId) {
        const query = `
            SELECT * FROM tracks 
            WHERE genre_id = $1
            ORDER BY duration_seconds
        `;
        const result = await db.query(query, [genreId]);
        return result.rows;
    }

    // Создать новый трек (для админа)
    async create(trackData) {
        const { title, artist, genre_id, duration_seconds, file_path, cover_url, added_by_admin_id } = trackData;
        const query = `
            INSERT INTO tracks (title, artist, genre_id, duration_seconds, file_path, cover_url, added_by_admin_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [title, artist, genre_id, duration_seconds, file_path, cover_url, added_by_admin_id];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Обновить трек (для админа)
    async update(id, trackData) {
        const { title, artist, genre_id, duration_seconds, cover_url } = trackData;
        
        console.log('📦 TrackModel.update получил данные:', {
            id,
            title,
            artist,
            genre_id,
            duration_seconds,
            cover_url
        });

        const query = `
            UPDATE tracks
            SET title = COALESCE($1, title),
                artist = COALESCE($2, artist),
                genre_id = COALESCE($3, genre_id),
                duration_seconds = COALESCE($4, duration_seconds),
                cover_url = COALESCE($5, cover_url)
            WHERE id = $6
            RETURNING *
        `;
        const values = [title, artist, genre_id, duration_seconds, cover_url, id];
        const result = await db.query(query, values);
        
        console.log('✅ TrackModel.update результат:', result.rows[0]);
        
        return result.rows[0];
    }

    // Удалить трек (для админа)
    async delete(id) {
        const query = 'DELETE FROM tracks WHERE id = $1 RETURNING id';
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // Получить статистику по трекам (для админки)
    async getStats() {
        const query = `
            SELECT 
                COUNT(*) as total_tracks,
                COUNT(DISTINCT artist) as total_artists,
                SUM(duration_seconds) as total_duration,
                AVG(duration_seconds) as avg_duration
            FROM tracks
        `;
        const result = await db.query(query);
        return result.rows[0];
    }
}

module.exports = new TrackModel();