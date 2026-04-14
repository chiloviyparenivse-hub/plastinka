const db = require('../config/database');

class PlaylistModel {
    // Создать новый плейлист
    async create(playlistData) {
        const { user_id, name, total_duration_seconds, target_duration_minutes, genre_id } = playlistData;
        const query = `
            INSERT INTO playlists (user_id, name, total_duration_seconds, target_duration_minutes, genre_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [user_id, name, total_duration_seconds, target_duration_minutes, genre_id];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Добавить треки в плейлист
    async addTracks(playlistId, tracks) {
        // tracks: массив объектов { track_id, track_order }
        if (!tracks || tracks.length === 0) return [];
        
        const values = tracks.map(t => `(${playlistId}, ${t.track_id}, ${t.track_order})`).join(',');
        const query = `
            INSERT INTO playlist_tracks (playlist_id, track_id, track_order)
            VALUES ${values}
            RETURNING *
        `;
        const result = await db.query(query);
        return result.rows;
    }

    // Получить плейлист с треками
    async getPlaylistWithTracks(playlistId) {
        const query = `
            SELECT 
                p.id,
                p.user_id,
                p.name,
                p.total_duration_seconds,
                p.target_duration_minutes,
                p.genre_id,
                p.created_at,
                p.downloaded_at,
                p.is_downloaded,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', t.id,
                            'title', t.title,
                            'artist', t.artist,
                            'duration', t.duration_seconds,
                            'duration_seconds', t.duration_seconds,
                            'genre_id', t.genre_id,
                            'file_path', t.file_path,
                            'cover_url', t.cover_url,
                            'order', pt.track_order
                        ) ORDER BY pt.track_order
                    ) FILTER (WHERE t.id IS NOT NULL),
                    '[]'::json
                ) as tracks
            FROM playlists p
            LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
            LEFT JOIN tracks t ON pt.track_id = t.id
            WHERE p.id = $1
            GROUP BY p.id
        `;
        const result = await db.query(query, [playlistId]);
        
        console.log('📦 getPlaylistWithTracks результат:', JSON.stringify(result.rows[0], null, 2));
        
        return result.rows[0];
    }

    // Получить плейлисты пользователя
    async getUserPlaylists(userId) {
        const query = `
            SELECT p.*, 
                   COUNT(pt.track_id) as tracks_count
            FROM playlists p
            LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
            WHERE p.user_id = $1
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    // Отметить плейлист как скачанный (офлайн)
    async markAsDownloaded(playlistId) {
        const query = `
            UPDATE playlists
            SET is_downloaded = true, downloaded_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await db.query(query, [playlistId]);
        return result.rows[0];
    }

    // Удалить плейлист
    async delete(playlistId, userId) {
        // Проверяем, что плейлист принадлежит пользователю
        const query = 'DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await db.query(query, [playlistId, userId]);
        return result.rows[0];
    }
}

module.exports = new PlaylistModel();