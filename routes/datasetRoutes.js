const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getGenres, createPlaylistByGenre } = require('../services/datasetService');

const router = express.Router();

// Получение списка жанров
router.get('/dataset/genres', authMiddleware, async (req, res) => {
    try {
        const genres = await getGenres();
        res.json(genres);
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создание плейлиста по жанру и времени
router.post('/dataset/create-playlist', authMiddleware, async (req, res) => {
    try {
        const { genre, targetMinutes } = req.body;
        
        if (!genre || !targetMinutes) {
            return res.status(400).json({ message: 'Укажите жанр и время' });
        }
        
        if (targetMinutes < 5 || targetMinutes > 180) {
            return res.status(400).json({ message: 'Время должно быть от 5 до 180 минут' });
        }
        
        const playlist = await createPlaylistByGenre(genre, targetMinutes);
        res.json(playlist);
    } catch (error) {
        console.error('Ошибка создания плейлиста:', error);
        res.status(500).json({ message: error.message || 'Ошибка сервера' });
    }
});

module.exports = router;