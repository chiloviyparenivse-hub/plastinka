const musicMetadata = require('music-metadata');
const fs = require('fs').promises;
const TrackModel = require('../models/trackModel');
const GenreModel = require('../models/genreModel');
const db = require('../config/database');

// Функция транслитерации жанра в key (вынесена отдельно)
function transliterateGenre(genreName) {
    if (!genreName) return null;
    
    const translitMap = {
        'рок': 'rock',
        'поп': 'pop',
        'электроника': 'electronic',
        'джаз': 'jazz',
        'классика': 'classical',
        'хип-хоп': 'hip_hop',
        'хип хоп': 'hip_hop',
        'метал': 'metal',
        'инди': 'indie',
        'фолк': 'folk',
        'блюз': 'blues',
        'регги': 'reggae',
        'кантри': 'country',
        'r&b': 'rnb',
        'rhythm and blues': 'rnb',
        'соул': 'soul',
        'фанк': 'funk',
        'техно': 'techno',
        'хаус': 'house',
        'транс': 'trance',
        'днб': 'drum_and_bass',
        'дабстеп': 'dubstep',
        'панк': 'punk',
        'альтернатива': 'alternative',
        'альтернативный рок': 'alternative_rock',
        'инди рок': 'indie_rock',
        'хард-рок': 'hard_rock',
        'хэви-метал': 'heavy_metal',
        'трэш-метал': 'thrash_metal',
        'дэт-метал': 'death_metal',
        'блэк-метал': 'black_metal',
        'пауэр-метал': 'power_metal',
        'прогрессивный метал': 'progressive_metal',
        'ню-метал': 'nu_metal',
        'пост-рок': 'post_rock',
        'пост-панк': 'post_punk',
        'шугейз': 'shoegaze',
        'дрим-поп': 'dream_pop',
        'лоу-фай': 'lo_fi',
        'эйсид-джаз': 'acid_jazz',
        'латин-джаз': 'latin_jazz',
        'свинг': 'swing',
        'бибоп': 'bebop',
        'блюграсс': 'bluegrass',
        'кантри-рок': 'country_rock',
        'реггетон': 'reggaeton',
        'сальса': 'salsa',
        'самба': 'samba',
        'босса-нова': 'bossa_nova',
        'танго': 'tango',
        'фламенко': 'flamenco',
        'кельтская': 'celtic',
        'русский фолк': 'russian_folk',
        'эмбиент': 'ambient',
        'чиллаут': 'chillout',
        'лаунж': 'lounge',
        'даунтемпо': 'downtempo',
        'индастриал': 'industrial',
        'ebm': 'ebm',
        'idm': 'idm',
        'глитч': 'glitch',
        'вейпорвейв': 'vaporwave',
        'синти-поп': 'synth_pop',
        'электропоп': 'electropop',
        'диско': 'disco',
        'евродэнс': 'eurodance',
        'брейкбит': 'breakbeat',
        'гэридж': 'garage',
        'дэнсхолл': 'dancehall',
        'афробитс': 'afrobeats',
        'трэп': 'trap',
        'клауд-рэп': 'cloud_rap',
        'эмо-рэп': 'emo_rap',
        'рэп': 'rap',
        'рнб': 'rnb',
        'современный r&b': 'contemporary_rnb',
        'нео-соул': 'neo_soul',
        'госпел': 'gospel',
        'спиричуэлс': 'spirituals',
        'опера': 'opera',
        'хоровая': 'choral',
        'симфоническая': 'symphonic',
        'камерная': 'chamber_music',
        'барокко': 'baroque',
        'романтизм': 'romantic',
        'минимализм': 'minimalism',
        'авангард': 'avant_garde',
        'нойз': 'noise',
        'дрон': 'drone',
        'психоделическая': 'psychedelic',
        'саундтрек': 'soundtrack',
        'игровая музыка': 'video_game_music',
        'детская': 'childrens',
        'колыбельные': 'lullabies',
        'шансон': 'chanson',
        'авторская песня': 'bard_song',
        'романс': 'romance',
        'инструментал': 'instrumental',
        'спа-музыка': 'spa_music',
        'медитативная': 'meditation',
        'футуристическая': 'future',
        'латино': 'latin',
        'кумбия': 'cumbia',
        'бачата': 'bachata',
        'меренге': 'merengue',
        'поп': 'pop',
        'pop': 'pop',
        'rock': 'rock',
        'jazz': 'jazz',
        'classical': 'classical',
        'electronic': 'electronic',
        'hip hop': 'hip_hop',
        'rnb': 'rnb',
        'soul': 'soul',
        'funk': 'funk',
        'blues': 'blues',
        'reggae': 'reggae',
        'country': 'country',
        'metal': 'metal',
        'punk': 'punk',
        'indie': 'indie',
        'folk': 'folk',
        'techno': 'techno',
        'house': 'house',
        'trance': 'trance',
        'drum and bass': 'drum_and_bass',
        'dubstep': 'dubstep',
        'ambient': 'ambient',
        'chillout': 'chillout',
    };
    
    const lowerGenre = genreName.toLowerCase().trim();
    
    if (translitMap[lowerGenre]) {
        return translitMap[lowerGenre];
    }
    
    for (const [ru, en] of Object.entries(translitMap)) {
        if (lowerGenre.includes(ru)) {
            return en;
        }
    }
    
    return lowerGenre.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

class TrackController {
    // Получить все треки (с фильтрацией)
    async getTracks(req, res) {
        try {
            const { genre_id } = req.query;
            const tracks = await TrackModel.findAll({ genre_id });
            
            console.log('Отправляем треки:', tracks.map(t => ({
                id: t.id,
                title: t.title,
                cover_url: t.cover_url
            })));
            
            res.json(tracks);
        } catch (error) {
            console.error('Ошибка получения треков:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Получить трек по ID
    async getTrackById(req, res) {
        try {
            const { id } = req.params;
            const track = await TrackModel.findById(id);
            
            if (!track) {
                return res.status(404).json({ message: 'Трек не найден' });
            }
            
            res.json(track);
        } catch (error) {
            console.error('Ошибка получения трека:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Извлечение метаданных из MP3 файла
    async extractMetadata(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Файл не загружен' });
            }

            const filePath = req.file.path;
            console.log('Временный файл:', filePath);
            
            try {
                const metadata = await musicMetadata.parseFile(filePath);
                
                let genreName = null;
                let genreKey = null;
                
                if (metadata.common.genre) {
                    let rawGenre = metadata.common.genre;
                    console.log('Найден жанр в common.genre:', rawGenre);
                    
                    if (typeof rawGenre === 'string') {
                        let cleaned = rawGenre.replace(/^\(\d+\)\s*/, '').replace(/^\d+\)\s*/, '');
                        genreName = cleaned;
                    } else if (Array.isArray(rawGenre) && rawGenre.length > 0) {
                        let cleaned = rawGenre[0].replace(/^\(\d+\)\s*/, '').replace(/^\d+\)\s*/, '');
                        genreName = cleaned;
                    }
                }
                
                if (!genreName && metadata.native) {
                    for (const version of ['ID3v2.3', 'ID3v2.4', 'ID3v2.2']) {
                        if (metadata.native[version]) {
                            const tconFrame = metadata.native[version].find(frame => frame.id === 'TCON');
                            if (tconFrame && tconFrame.value) {
                                let rawGenre = tconFrame.value;
                                console.log('Найден жанр в', version, 'TCON:', rawGenre);
                                
                                if (typeof rawGenre === 'string') {
                                    let cleaned = rawGenre.replace(/^\(\d+\)\s*/, '').replace(/^\d+\)\s*/, '');
                                    genreName = cleaned;
                                }
                                break;
                            }
                        }
                    }
                }
                
                if (genreName) {
                    genreKey = transliterateGenre(genreName);
                    console.log('Жанр:', genreName, '-> key:', genreKey);
                }

                const result = {
                    title: metadata.common.title || '',
                    artist: metadata.common.artist || '',
                    album: metadata.common.album || '',
                    year: metadata.common.year || '',
                    duration: Math.floor(metadata.format.duration) || 0,
                    bitrate: metadata.format.bitrate || 0,
                    sampleRate: metadata.format.sampleRate || 0,
                    genre: genreName,
                    genreKey: genreKey,
                };

                console.log('Результат извлечения:', {
                    title: result.title,
                    artist: result.artist,
                    duration: result.duration,
                    genre: result.genre,
                    genreKey: result.genreKey
                });

                if (metadata.common.picture && metadata.common.picture.length > 0) {
                    const picture = metadata.common.picture[0];
                    result.cover = picture.data.toString('base64');
                    result.coverFormat = picture.format;
                    console.log('Обложка извлечена, размер:', picture.data.length, 'bytes');
                }

                await fs.unlink(filePath);
                console.log('Временный файл удален');

                res.json(result);

            } catch (metadataError) {
                console.error('Ошибка парсинга метаданных:', metadataError);
                await fs.unlink(filePath).catch(() => {});
                res.json({
                    title: '',
                    artist: '',
                    duration: 0,
                    genre: null,
                    genreKey: null,
                    message: 'Не удалось извлечь метаданные'
                });
            }

        } catch (error) {
            console.error('Ошибка извлечения метаданных:', error);
            res.status(500).json({ message: 'Ошибка сервера: ' + error.message });
        }
    }

    // Создать новый трек (только админ)
    async createTrack(req, res) {
        try {
            const { title, artist, genre_id, duration_seconds } = req.body;
            
            console.log('Данные для создания трека:', {
                title,
                artist,
                genre_id,
                duration_seconds,
                user: req.user,
                files: req.files
            });

            if (!title || !artist || !genre_id || !duration_seconds) {
                return res.status(400).json({ 
                    message: 'Все поля обязательны',
                    required: ['title', 'artist', 'genre_id', 'duration_seconds']
                });
            }

            const genre = await GenreModel.findById(genre_id);
            if (!genre) {
                return res.status(400).json({ message: 'Жанр не существует' });
            }

            if (!req.files || !req.files.audio) {
                return res.status(400).json({ message: 'MP3 файл не загружен' });
            }

            if (!req.user.isAdmin) {
                return res.status(403).json({ 
                    message: 'Доступ запрещен. Только для администраторов.',
                    email: req.user.email 
                });
            }

            const adminId = req.user.id;
            console.log('Админ создает трек, ID:', adminId);

            // Определяем путь для загрузки в зависимости от окружения
            const isProduction = process.env.NODE_ENV === 'production';
            const uploadsDir = isProduction ? '/app/uploads' : 'uploads';
            
            const audioPath = `${uploadsDir}/music/${req.files.audio[0].filename}`;
            const coverPath = req.files.cover ? `${uploadsDir}/covers/${req.files.cover[0].filename}` : null;
            
            console.log('Аудио файл:', audioPath);
            console.log('Обложка:', coverPath || 'не загружена');

            const newTrack = await TrackModel.create({
                title,
                artist,
                genre_id: parseInt(genre_id),
                duration_seconds: parseInt(duration_seconds),
                file_path: audioPath,
                cover_url: coverPath,
                added_by_admin_id: adminId
            });

            console.log('Трек создан:', newTrack);

            res.status(201).json({
                message: 'Трек успешно добавлен',
                track: newTrack
            });

        } catch (error) {
            console.error('Ошибка создания трека:', error);
            
            if (error.code === '23503') {
                return res.status(400).json({ 
                    message: 'Ошибка внешнего ключа. Проверьте ID администратора и жанра',
                    detail: error.detail
                });
            }
            
            res.status(500).json({ 
                message: 'Ошибка сервера',
                error: error.message 
            });
        }
    }

    // Обновить трек (только админ)
    async updateTrack(req, res) {
        try {
            const { id } = req.params;
            const { title, artist, genre_id, duration_seconds } = req.body;

            console.log('Обновление трека:', {
                id,
                title,
                artist,
                genre_id,
                duration_seconds,
                files: req.files
            });

            if (!req.user.isAdmin) {
                return res.status(403).json({ message: 'Доступ запрещен. Только для администраторов.' });
            }

            const existingTrack = await TrackModel.findById(id);
            if (!existingTrack) {
                return res.status(404).json({ message: 'Трек не найден' });
            }

            if (genre_id) {
                const genre = await GenreModel.findById(genre_id);
                if (!genre) {
                    return res.status(400).json({ message: 'Жанр не существует' });
                }
            }

            const isProduction = process.env.NODE_ENV === 'production';
            const uploadsDir = isProduction ? '/app/uploads' : 'uploads';

            const updateData = {
                title: title || existingTrack.title,
                artist: artist || existingTrack.artist,
                genre_id: genre_id ? parseInt(genre_id) : existingTrack.genre_id,
                duration_seconds: duration_seconds ? parseInt(duration_seconds) : existingTrack.duration_seconds,
            };

            if (req.files && req.files.cover) {
                updateData.cover_url = `${uploadsDir}/covers/${req.files.cover[0].filename}`;
                console.log('Новая обложка:', updateData.cover_url);
            }

            console.log('Данные для обновления:', updateData);

            const updatedTrack = await TrackModel.update(id, updateData);

            res.json({
                message: 'Трек обновлен',
                track: updatedTrack
            });

        } catch (error) {
            console.error('Ошибка обновления трека:', error);
            res.status(500).json({ message: 'Ошибка сервера: ' + error.message });
        }
    }

    // Удалить трек (только админ)
    async deleteTrack(req, res) {
        try {
            const { id } = req.params;

            if (!req.user.isAdmin) {
                return res.status(403).json({ message: 'Доступ запрещен. Только для администраторов.' });
            }

            const existingTrack = await TrackModel.findById(id);
            if (!existingTrack) {
                return res.status(404).json({ message: 'Трек не найден' });
            }

            await TrackModel.delete(id);

            res.json({ message: 'Трек удален' });
        } catch (error) {
            console.error('Ошибка удаления трека:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Получить статистику (для админки)
    async getStats(req, res) {
        try {
            const stats = await TrackModel.getStats();
            const genreStats = await this.getGenreStats();
            
            res.json({
                ...stats,
                byGenre: genreStats
            });
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            res.status(500).json({ message: 'Ошибка сервера' });
        }
    }

    // Вспомогательный метод: статистика по жанрам
    async getGenreStats() {
        const genres = await GenreModel.findAll();
        const stats = [];
        
        for (const genre of genres) {
            const tracks = await TrackModel.findByGenre(genre.id);
            stats.push({
                genre_id: genre.id,
                genre_name: genre.name,
                count: tracks.length,
                total_duration: tracks.reduce((sum, t) => sum + t.duration_seconds, 0)
            });
        }
        
        return stats;
    }
}

module.exports = new TrackController();