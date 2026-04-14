const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем папки, если их нет
const musicDir = 'uploads/music';
const coversDir = 'uploads/covers';
const tempDir = 'uploads/temp';
const avatarsDir = 'uploads/avatars';

[musicDir, coversDir, tempDir, avatarsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Настройка хранилища для аватаров
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Настройка хранилища для временных файлов (для извлечения метаданных)
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + '.mp3');
  }
});

// Настройка хранилища для аудио
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, musicDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'track-' + uniqueSuffix + '.mp3');
  }
});

// Настройка хранилища для обложек
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coversDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Фильтр для аудио - только MP3
const audioFilter = (req, file, cb) => {
  if (file.mimetype === 'audio/mpeg') {
    cb(null, true);
  } else {
    cb(new Error('Только MP3 файлы разрешены'), false);
  }
};

// Фильтр для изображений
const coverFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Только изображения разрешены'), false);
  }
};

// Фильтр для аватаров
const avatarFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Только изображения разрешены'), false);
  }
};

const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const uploadCover = multer({
  storage: coverStorage,
  fileFilter: coverFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Для извлечения метаданных (временный файл)
const uploadTemp = multer({
  storage: tempStorage,
  fileFilter: audioFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
}).single('file');

// Middleware для загрузки обоих файлов
const uploadBoth = (req, res, next) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        if (file.fieldname === 'audio') {
          cb(null, musicDir);
        } else if (file.fieldname === 'cover') {
          cb(null, coversDir);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        if (file.fieldname === 'audio') {
          cb(null, 'track-' + uniqueSuffix + '.mp3');
        } else if (file.fieldname === 'cover') {
          cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
        }
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'audio' && file.mimetype === 'audio/mpeg') {
        cb(null, true);
      } else if (file.fieldname === 'cover' && file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Неправильный тип файла'), false);
      }
    },
    limits: {
      fileSize: file => file.fieldname === 'audio' ? 50 * 1024 * 1024 : 5 * 1024 * 1024
    }
  }).fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]);

  upload(req, res, next);
};

module.exports = { 
  uploadAudio: uploadAudio.single('audio'), 
  uploadCover: uploadCover.single('cover'),
  uploadBoth,
  uploadTemp,
  uploadAvatar
};