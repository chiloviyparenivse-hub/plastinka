const YandexDisk = require('yandisk');

let diskInstance = null;

function getDiskClient() {
    if (!diskInstance) {
        const token = process.env.YANDEX_DISK_TOKEN;
        if (!token) {
            throw new Error('YANDEX_DISK_TOKEN не задан в переменных окружения');
        }
        diskInstance = new YandexDisk(token, '/');
    }
    return diskInstance;
}

async function uploadToYandexDisk(fileBuffer, originalName, folder = 'music') {
    try {
        const disk = getDiskClient();
        
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const fileExtension = originalName.split('.').pop();
        const fileName = `${timestamp}_${random}.${fileExtension}`;
        const remotePath = `plastinka/${folder}/${fileName}`;
        
        console.log(`📤 Загрузка на Яндекс.Диск: ${remotePath}`);
        
        const uploadSuccess = await disk.uploadFile(remotePath, fileBuffer);
        
        if (!uploadSuccess) {
            throw new Error('Не удалось загрузить файл');
        }
        
        const publicUrl = await disk.getPublicUrl(remotePath);
        
        console.log(`✅ Файл загружен: ${publicUrl}`);
        return publicUrl;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки на Яндекс.Диск:', error);
        throw error;
    }
}

async function deleteFromYandexDisk(fileUrl) {
    try {
        const disk = getDiskClient();
        
        const urlParts = fileUrl.split('/');
        const pathParts = urlParts.slice(urlParts.indexOf('plastinka')).join('/');
        const remotePath = decodeURIComponent(pathParts);
        
        console.log(`🗑️ Удаление с Яндекс.Диска: ${remotePath}`);
        
        await disk.deleteFile(remotePath);
        console.log(`✅ Файл удален: ${remotePath}`);
        
    } catch (error) {
        console.error('❌ Ошибка удаления с Яндекс.Диска:', error);
    }
}

module.exports = {
    uploadToYandexDisk,
    deleteFromYandexDisk
};