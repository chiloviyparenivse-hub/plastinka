const db = require('../config/database');

class UserController {
    // Получить всех пользователей
    async getAllUsers(req, res) {
        try {
            const query = `
                SELECT 
                    u.id, 
                    u.nickname, 
                    u.email, 
                    u.avatar_url,
                    u.created_at,
                    u.updated_at,
                    u.subscription_type,
                    u.subscription_expires_at,
                    COUNT(DISTINCT p.id) as playlists_count,
                    COUNT(DISTINCT pt.track_id) as total_tracks
                FROM users u
                LEFT JOIN playlists p ON p.user_id = u.id
                LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
                GROUP BY u.id
                ORDER BY u.created_at DESC
            `;
            
            const result = await db.query(query);
            console.log(`Загружено ${result.rows.length} пользователей`);
            res.json(result.rows);
        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Получить пользователя по ID
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            
            const userQuery = `
                SELECT 
                    u.id, 
                    u.nickname, 
                    u.email, 
                    u.avatar_url,
                    u.created_at,
                    u.updated_at,
                    u.subscription_type,
                    u.subscription_expires_at,
                    COUNT(DISTINCT p.id) as playlists_count,
                    COUNT(DISTINCT pt.track_id) as total_tracks,
                    COALESCE(SUM(t.duration_seconds), 0) as total_duration
                FROM users u
                LEFT JOIN playlists p ON p.user_id = u.id
                LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
                LEFT JOIN tracks t ON t.id = pt.track_id
                WHERE u.id = $1
                GROUP BY u.id
            `;
            
            const userResult = await db.query(userQuery, [id]);
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            
            const playlistsQuery = `
                SELECT 
                    p.id,
                    p.name,
                    p.total_duration_seconds,
                    p.created_at,
                    COUNT(DISTINCT pt.track_id) as tracks_count
                FROM playlists p
                LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
                WHERE p.user_id = $1
                GROUP BY p.id
                ORDER BY p.created_at DESC
            `;
            
            const playlistsResult = await db.query(playlistsQuery, [id]);
            
            res.json({
                ...userResult.rows[0],
                playlists: playlistsResult.rows
            });
        } catch (error) {
            console.error('Ошибка получения пользователя:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Обновить пользователя
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { nickname, email, subscription_type, subscription_expires_at } = req.body;
            
            const checkQuery = 'SELECT * FROM users WHERE id = $1';
            const checkResult = await db.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            
            const updates = [];
            const values = [];
            let paramIndex = 1;
            
            if (nickname !== undefined && nickname !== '') {
                updates.push(`nickname = $${paramIndex++}`);
                values.push(nickname);
            }
            
            if (email !== undefined && email !== '') {
                updates.push(`email = $${paramIndex++}`);
                values.push(email);
            }
            
            if (subscription_type !== undefined) {
                updates.push(`subscription_type = $${paramIndex++}`);
                values.push(subscription_type);
            }
            
            if (subscription_expires_at !== undefined) {
                updates.push(`subscription_expires_at = $${paramIndex++}`);
                values.push(subscription_expires_at);
            }
            
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            
            if (updates.length === 1) {
                return res.status(400).json({ message: 'Нет данных для обновления' });
            }
            
            values.push(id);
            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, nickname, email, avatar_url, subscription_type, subscription_expires_at, created_at, updated_at`;
            
            const result = await db.query(query, values);
            
            console.log(`Обновлен пользователь ${id}`);
            res.json({
                message: 'Пользователь обновлен',
                user: result.rows[0]
            });
        } catch (error) {
            console.error('Ошибка обновления пользователя:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Удалить пользователя
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            
            const checkQuery = 'SELECT * FROM users WHERE id = $1';
            const checkResult = await db.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }
            
            await db.query('BEGIN');
            
            await db.query(`
                DELETE FROM playlist_tracks 
                WHERE playlist_id IN (SELECT id FROM playlists WHERE user_id = $1)
            `, [id]);
            
            await db.query('DELETE FROM playlists WHERE user_id = $1', [id]);
            await db.query('DELETE FROM users WHERE id = $1', [id]);
            
            await db.query('COMMIT');
            
            res.json({ message: 'Пользователь удален' });
        } catch (error) {
            await db.query('ROLLBACK');
            console.error('Ошибка удаления пользователя:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new UserController();