const TrackModel = require('../models/trackModel');
const PlaylistModel = require('../models/playlistModel');
const playlistAlgorithm = require('../utils/playlistAlgorithm');

class PlaylistController {
    // Создать новый плейлист (один жанр)
    async createPlaylist(req, res) {
        try {
            const { genre_id, target_minutes } = req.body;
            const user_id = req.user.id;

            console.log('Создание плейлиста:', { genre_id, target_minutes, user_id });

            if (!genre_id || !target_minutes) {
                return res.status(400).json({ message: 'Жанр и время обязательны' });
            }

            if (target_minutes < 5 || target_minutes > 180) {
                return res.status(400).json({ message: 'Время должно быть от 5 до 180 минут' });
            }

            const tracks = await TrackModel.findByGenre(genre_id);
            
            if (!tracks || tracks.length === 0) {
                return res.status(404).json({ message: 'Нет треков в выбранном жанре' });
            }

            console.log(`Найдено ${tracks.length} треков в жанре`);

            const result = playlistAlgorithm.generateOptimized(tracks, target_minutes);

            if (result.tracks.length === 0) {
                return res.status(404).json({ message: 'Не удалось подобрать треки' });
            }

            const actualMinutes = (result.totalDuration / 60).toFixed(2);
            const accuracyMinutes = Math.abs(result.totalDuration / 60 - target_minutes).toFixed(2);
            
            console.log(`Алгоритм подобрал ${result.tracks.length} треков, сумма: ${actualMinutes} мин, цель: ${target_minutes} мин, разница: ±${accuracyMinutes} мин`);

            const playlist = await PlaylistModel.create({
                user_id,
                name: `Плейлист на ${target_minutes} мин`,
                total_duration_seconds: result.totalDuration,
                target_duration_minutes: target_minutes,
                genre_id
            });

            console.log(`Плейлист создан с ID: ${playlist.id}`);

            const tracksWithOrder = result.tracks.map((track, index) => ({
                track_id: track.id,
                track_order: index + 1
            }));
            
            await PlaylistModel.addTracks(playlist.id, tracksWithOrder);

            console.log(`Добавлено ${tracksWithOrder.length} треков в плейлист`);

            const fullPlaylist = await PlaylistModel.getPlaylistWithTracks(playlist.id);

            const diffMinutes = Math.abs(fullPlaylist.total_duration_seconds / 60 - target_minutes);
            
            console.log('Отправляем плейлист клиенту');
            
            res.status(201).json({
                message: 'Плейлист успешно создан',
                playlist: fullPlaylist,
                accuracy: {
                    target: target_minutes,
                    actual: fullPlaylist.total_duration_seconds / 60,
                    difference: diffMinutes,
                    isAccurate: diffMinutes <= 1.0
                }
            });

        } catch (error) {
            console.error('Ошибка создания плейлиста:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Создать мультижанровый плейлист
    async createMultiGenrePlaylist(req, res) {
        try {
            const { blocks } = req.body;
            const user_id = req.user.id;

            console.log('Создание мультижанрового плейлиста:', { blocks, user_id });

            if (!blocks || blocks.length === 0) {
                return res.status(400).json({ message: 'Необходимо указать хотя бы один блок' });
            }

            const allTracks = [];
            let totalDuration = 0;
            let usedTrackIds = new Set();

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                const { genre_id, target_minutes } = block;

                if (!genre_id || !target_minutes) {
                    return res.status(400).json({ 
                        message: `Блок ${i + 1} должен содержать genre_id и target_minutes` 
                    });
                }

                if (target_minutes < 5 || target_minutes > 180) {
                    return res.status(400).json({ 
                        message: `Время в блоке ${i + 1} должно быть от 5 до 180 минут` 
                    });
                }

                let tracks = await TrackModel.findByGenre(genre_id);
                
                if (!tracks || tracks.length === 0) {
                    return res.status(404).json({ 
                        message: `Нет треков в жанре для блока ${i + 1}` 
                    });
                }

                console.log(`Блок ${i + 1}: жанр ${genre_id}, найдено ${tracks.length} треков`);

                const result = playlistAlgorithm.generateOptimizedForBlock(
                    tracks, 
                    target_minutes, 
                    usedTrackIds
                );

                if (result.tracks.length === 0) {
                    return res.status(404).json({ 
                        message: `Не удалось подобрать треки для блока ${i + 1}` 
                    });
                }

                const actualMinutes = (result.totalDuration / 60).toFixed(2);
                const targetMinutesBlock = target_minutes;
                const accuracyMinutes = Math.abs(result.totalDuration / 60 - target_minutes).toFixed(2);
                
                console.log(`Блок ${i + 1}: подобрано ${result.tracks.length} треков, сумма: ${actualMinutes} мин, цель: ${targetMinutesBlock} мин, разница: ±${accuracyMinutes} мин`);

                for (const track of result.tracks) {
                    allTracks.push(track);
                    totalDuration += track.duration_seconds;
                    usedTrackIds.add(track.id);
                }
            }

            const totalMinutes = blocks.reduce((sum, b) => sum + b.target_minutes, 0);
            const actualTotalMinutes = (totalDuration / 60).toFixed(2);
            const totalAccuracy = Math.abs(totalDuration / 60 - totalMinutes).toFixed(2);
            
            console.log(`Всего уникальных треков: ${allTracks.length}`);
            console.log(`Общая сумма: ${actualTotalMinutes} мин, цель: ${totalMinutes} мин, точность: ±${totalAccuracy} мин`);
            console.log(`Порядок треков соответствует порядку блоков`);

            const orderedTracks = [...allTracks];

            const playlist = await PlaylistModel.create({
                user_id,
                name: `Микс на ${totalMinutes} мин`,
                total_duration_seconds: totalDuration,
                target_duration_minutes: totalMinutes,
                genre_id: null
            });

            console.log(`Мультижанровый плейлист создан с ID: ${playlist.id}`);

            const tracksWithOrder = orderedTracks.map((track, index) => ({
                track_id: track.id,
                track_order: index + 1
            }));
            
            await PlaylistModel.addTracks(playlist.id, tracksWithOrder);

            console.log(`Добавлено ${tracksWithOrder.length} треков в плейлист`);

            const fullPlaylist = await PlaylistModel.getPlaylistWithTracks(playlist.id);

            console.log('Отправляем мультижанровый плейлист клиенту:', {
                id: playlist.id,
                tracksCount: fullPlaylist.tracks.length,
                totalMinutes,
                actualMinutes: actualTotalMinutes,
                accuracy: totalAccuracy,
                blocksOrder: blocks.map((b, idx) => `Блок ${idx+1}: жанр ${b.genre_id}`)
            });

            res.status(201).json({
                message: 'Мультижанровый плейлист успешно создан',
                playlist: fullPlaylist,
                blocks: blocks.map(b => ({
                    genre_id: b.genre_id,
                    minutes: b.target_minutes
                })),
                accuracy: {
                    target: totalMinutes,
                    actual: parseFloat(actualTotalMinutes),
                    difference: parseFloat(totalAccuracy),
                    isAccurate: parseFloat(totalAccuracy) <= 1.0
                }
            });

        } catch (error) {
            console.error('Ошибка создания мультижанрового плейлиста:', error);
            res.status(500).json({ message: 'Ошибка сервера: ' + error.message });
        }
    }

    // Получить плейлисты пользователя
    async getUserPlaylists(req, res) {
        try {
            const playlists = await PlaylistModel.getUserPlaylists(req.user.id);
            
            const fullPlaylists = await Promise.all(
                playlists.map(async p => {
                    return await PlaylistModel.getPlaylistWithTracks(p.id);
                })
            );

            console.log(`Отправляем ${fullPlaylists.length} плейлистов пользователю`);
            
            res.json(fullPlaylists);

        } catch (error) {
            console.error('Ошибка получения плейлистов:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Получить конкретный плейлист
    async getPlaylist(req, res) {
        try {
            const { id } = req.params;
            
            const playlist = await PlaylistModel.getPlaylistWithTracks(id);
            
            if (!playlist) {
                return res.status(404).json({ message: 'Плейлист не найден' });
            }

            if (playlist.user_id !== req.user.id) {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }

            console.log(`Отправляем плейлист ${id}`);
            res.json(playlist);

        } catch (error) {
            console.error('Ошибка получения плейлиста:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Отметить плейлист как скачанный
    async markAsDownloaded(req, res) {
        try {
            const { id } = req.params;
            
            const playlist = await PlaylistModel.getPlaylistWithTracks(id);
            
            if (!playlist) {
                return res.status(404).json({ message: 'Плейлист не найден' });
            }

            if (playlist.user_id !== req.user.id) {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }

            const updated = await PlaylistModel.markAsDownloaded(id);

            res.json({
                message: 'Плейлист отмечен для офлайн-доступа',
                playlist: updated
            });

        } catch (error) {
            console.error('Ошибка отметки плейлиста:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Удалить плейлист
    async deletePlaylist(req, res) {
        try {
            const { id } = req.params;
            
            const deleted = await PlaylistModel.delete(id, req.user.id);
            
            if (!deleted) {
                return res.status(404).json({ message: 'Плейлист не найден или не принадлежит пользователю' });
            }

            res.json({ message: 'Плейлист удален' });

        } catch (error) {
            console.error('Ошибка удаления плейлиста:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }
}

module.exports = new PlaylistController();