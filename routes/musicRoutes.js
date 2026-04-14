const express = require('express');
const { body } = require('express-validator');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validatePlaylistLimits } = require('../middleware/subscriptionMiddleware');
const { uploadBoth, uploadTemp } = require('../middleware/upload');
const playlistController = require('../controllers/playlistController');
const trackController = require('../controllers/trackController');
const genreController = require('../controllers/genreController');
const userController = require('../controllers/userController');

const router = express.Router();

// ==================== ПУБЛИЧНЫЕ МАРШРУТЫ ====================
router.get('/genres/public', genreController.getPublicGenres);
router.get('/genres', authMiddleware, genreController.getAllGenres);
router.get('/tracks', trackController.getTracks);
router.get('/tracks/:id', trackController.getTrackById);

// ==================== ДЛЯ АВТОРИЗОВАННЫХ ====================
router.post('/playlists', 
    authMiddleware,
    validatePlaylistLimits,
    [
        body('genre_id').isInt().withMessage('ID жанра должен быть числом'),
        body('target_minutes').isInt({ min: 5, max: 180 }).withMessage('Время должно быть от 5 до 180 минут')
    ],
    playlistController.createPlaylist
);

// МУЛЬТИЖАНРОВЫЙ ПЛЕЙЛИСТ
router.post('/playlists/multi-genre',
    authMiddleware,
    validatePlaylistLimits,
    [
        body('blocks').isArray().withMessage('blocks должен быть массивом'),
        body('blocks.*.genre_id').isInt().withMessage('ID жанра должен быть числом'),
        body('blocks.*.target_minutes').isInt({ min: 5, max: 180 }).withMessage('Время должно быть от 5 до 180 минут')
    ],
    playlistController.createMultiGenrePlaylist
);

router.get('/playlists', authMiddleware, playlistController.getUserPlaylists);
router.get('/playlists/:id', authMiddleware, playlistController.getPlaylist);
router.put('/playlists/:id/download', authMiddleware, playlistController.markAsDownloaded);
router.delete('/playlists/:id', authMiddleware, playlistController.deletePlaylist);

// ==================== ТОЛЬКО ДЛЯ АДМИНОВ ====================

// Извлечение метаданных из MP3
router.post('/admin/extract-metadata',
    adminMiddleware,
    uploadTemp,
    trackController.extractMetadata
);

// Управление жанрами
router.post('/admin/genres', 
    adminMiddleware,
    [
        body('key').notEmpty().withMessage('Ключ жанра обязателен'),
        body('name').notEmpty().withMessage('Название жанра обязательно')
    ],
    genreController.createGenre
);

router.put('/admin/genres/:id', 
    adminMiddleware,
    genreController.updateGenre
);

router.delete('/admin/genres/:id', 
    adminMiddleware,
    genreController.deleteGenre
);

// Управление треками
router.post('/admin/tracks',
    adminMiddleware,
    uploadBoth,
    [
        body('title').notEmpty().withMessage('Название трека обязательно'),
        body('artist').notEmpty().withMessage('Исполнитель обязателен'),
        body('genre_id').isInt().withMessage('ID жанра должен быть числом'),
        body('duration_seconds').isInt({ min: 10, max: 3600 }).withMessage('Длительность должна быть от 10 до 3600 секунд')
    ],
    trackController.createTrack
);

router.put('/admin/tracks/:id',
    adminMiddleware,
    uploadBoth,
    [
        body('title').optional().notEmpty(),
        body('artist').optional().notEmpty(),
        body('genre_id').optional().isInt(),
        body('duration_seconds').optional().isInt({ min: 10, max: 3600 })
    ],
    trackController.updateTrack
);

router.delete('/admin/tracks/:id',
    adminMiddleware,
    trackController.deleteTrack
);

router.get('/admin/stats',
    adminMiddleware,
    trackController.getStats
);

// Управление пользователями
router.get('/admin/users', 
    adminMiddleware,
    userController.getAllUsers
);

router.get('/admin/users/:id', 
    adminMiddleware,
    userController.getUserById
);

router.put('/admin/users/:id', 
    adminMiddleware,
    [
        body('nickname').optional().notEmpty(),
        body('email').optional().isEmail(),
        body('subscription_type').optional().isIn(['free', 'premium']),
        body('subscription_expires_at').optional()
    ],
    userController.updateUser
);

router.delete('/admin/users/:id', 
    adminMiddleware,
    userController.deleteUser
);

module.exports = router;