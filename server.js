const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const musicRoutes = require('./routes/musicRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const datasetRoutes = require('./routes/datasetRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api', musicRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', datasetRoutes);

// Базовый маршрут
app.get('/', (req, res) => {
    res.json({ 
        message: 'Добро пожаловать в API Пластинка',
        version: '2.0.0',
        status: 'running',
        endpoints: {
            auth: '/api/auth',
            genres: '/api/genres',
            tracks: '/api/tracks',
            playlists: '/api/playlists',
            admin: '/api/admin',
            subscription: '/api/subscription',
            dataset: '/api/dataset'
        }
    });
});

// Статические файлы
app.use('/storage', express.static('storage'));

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ message: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err.stack);
    res.status(500).json({ 
        message: 'Внутренняя ошибка сервера',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Создаем папки для хранения файлов
const fs = require('fs');
const path = require('path');

const storageDir = path.join(__dirname, 'storage/tracks');
const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(__dirname, 'uploads/avatars');
const musicDir = path.join(__dirname, 'uploads/music');
const coversDir = path.join(__dirname, 'uploads/covers');
const tempDir = path.join(__dirname, 'uploads/temp');
const dataDir = path.join(__dirname, 'data');

[storageDir, uploadsDir, avatarsDir, musicDir, coversDir, tempDir, dataDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Создана папка: ${dir}`);
    }
});

// Очистка просроченных OTP кодов каждый час
const db = require('./config/database');
setInterval(async () => {
    try {
        const result = await db.query(
            'DELETE FROM otp_codes WHERE expires_at < NOW() OR is_used = true'
        );
        if (result.rowCount > 0) {
            console.log(`🗑️ Удалено ${result.rowCount} просроченных OTP кодов`);
        }
    } catch (error) {
        console.error('Ошибка очистки OTP кодов:', error);
    }
}, 60 * 60 * 1000);

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🌍 http://localhost:${PORT}`);
    console.log('\n📌 Доступные маршруты:');
    console.log('   GET  /');
    console.log('   POST /api/auth/send-otp');
    console.log('   POST /api/auth/verify-otp');
    console.log('   GET  /api/auth/profile');
    console.log('   PUT  /api/auth/profile');
    console.log('   GET  /api/genres');
    console.log('   GET  /api/tracks');
    console.log('   POST /api/playlists (auth)');
    console.log('   GET  /api/playlists (auth)');
    console.log('   POST /api/admin/tracks (admin)');
    console.log('   POST /api/admin/genres (admin)');
    console.log('   GET  /api/subscription/status (auth)');
    console.log('   POST /api/subscription/activate-premium (auth)');
    console.log('   POST /api/subscription/cancel (auth)');
    console.log('   GET  /api/dataset/stats (auth)');
    console.log('   POST /api/dataset/create-playlist (auth)\n');
});