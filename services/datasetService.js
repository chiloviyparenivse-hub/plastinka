const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../data/spotify_genres.csv');
let cachedTracks = null;
let cachedGenres = null;

// Загрузка всех треков из CSV
const loadTracks = async () => {
    if (cachedTracks) {
        return cachedTracks;
    }
    
    return new Promise((resolve, reject) => {
        const tracks = [];
        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (data) => {
                tracks.push({
                    id: data.track_id,
                    title: data.track_name,
                    artist: data.artists,
                    album: data.album_name,
                    genre: data.track_genre,
                    popularity: parseInt(data.popularity) || 0,
                    duration_ms: parseInt(data.duration_ms) || 180000,
                    duration_seconds: Math.floor(parseInt(data.duration_ms) / 1000) || 180,
                    danceability: parseFloat(data.danceability) || 0,
                    energy: parseFloat(data.energy) || 0,
                });
            })
            .on('end', () => {
                cachedTracks = tracks;
                console.log(`Загружено ${tracks.length} треков из датасета`);
                resolve(tracks);
            })
            .on('error', reject);
    });
};

// Получение всех уникальных жанров
const getGenres = async () => {
    if (cachedGenres) {
        return cachedGenres;
    }
    
    const tracks = await loadTracks();
    const uniqueGenres = [...new Set(tracks.map(track => track.genre))];
    uniqueGenres.sort();
    
    cachedGenres = uniqueGenres.map((name, index) => ({ id: index + 1, name }));
    console.log(`Загружено ${cachedGenres.length} жанров`);
    return cachedGenres;
};

// АЛГОРИТМ ИНТЕЛЛЕКТУАЛЬНОГО ПОДБОРА (ТОЧНО ТАКОЙ ЖЕ, КАК В ТВОЕМ КОДЕ)
const generateOptimized = (tracks, targetMinutes) => {
    if (!tracks || tracks.length === 0) {
        return { tracks: [], totalDuration: 0, accuracy: 0 };
    }

    const targetSeconds = targetMinutes * 60;
    
    let bestResult = { tracks: [], totalDuration: 0, diff: Infinity };
    const attempts = 200;
    
    for (let attempt = 0; attempt < attempts; attempt++) {
        const shuffled = shuffleArray([...tracks]);
        const selected = [];
        let currentSum = 0;
        let remaining = targetSeconds;
        
        // Добавляем треки
        for (const track of shuffled) {
            if (track.duration_seconds <= remaining + 10) {
                selected.push(track);
                currentSum += track.duration_seconds;
                remaining -= track.duration_seconds;
            }
            if (remaining <= 0) break;
        }
        
        // Если не добрали, пробуем добавить еще один трек
        if (remaining > 0 && remaining < 60) {
            for (const track of shuffled) {
                if (!selected.includes(track) && 
                    track.duration_seconds <= remaining + 30 &&
                    track.duration_seconds >= remaining - 30) {
                    selected.push(track);
                    currentSum += track.duration_seconds;
                    remaining -= track.duration_seconds;
                    break;
                }
            }
        }
        
        // Если перебрали, пытаемся заменить последний трек
        if (currentSum > targetSeconds + 10 && selected.length > 0) {
            const lastTrack = selected.pop();
            currentSum -= lastTrack.duration_seconds;
            remaining = targetSeconds - currentSum;
            
            let bestReplacement = null;
            let bestReplacementDiff = Infinity;
            
            for (const track of shuffled) {
                if (!selected.includes(track) && 
                    track.duration_seconds <= remaining + 15) {
                    const diff = Math.abs(track.duration_seconds - remaining);
                    if (diff < bestReplacementDiff) {
                        bestReplacementDiff = diff;
                        bestReplacement = track;
                    }
                }
            }
            
            if (bestReplacement && bestReplacementDiff < 15) {
                selected.push(bestReplacement);
                currentSum += bestReplacement.duration_seconds;
            } else {
                selected.push(lastTrack);
                currentSum += lastTrack.duration_seconds;
            }
        }
        
        const diff = Math.abs(currentSum - targetSeconds);
        
        if (diff < bestResult.diff) {
            bestResult = {
                tracks: [...selected],
                totalDuration: currentSum,
                diff: diff
            };
        }
        
        if (bestResult.diff === 0) break;
    }
    
    // Если набрали мало треков, добавляем больше
    if (bestResult.tracks.length < 3 && tracks.length >= 3 && bestResult.diff > 30) {
        const allTracks = [...bestResult.tracks];
        let currentSum = bestResult.totalDuration;
        const remainingTracks = tracks.filter(t => !allTracks.includes(t));
        
        for (const track of remainingTracks) {
            if (currentSum + track.duration_seconds <= targetSeconds + 10) {
                allTracks.push(track);
                currentSum += track.duration_seconds;
            }
            if (currentSum >= targetSeconds - 30) break;
        }
        
        if (allTracks.length > bestResult.tracks.length) {
            bestResult = {
                tracks: allTracks,
                totalDuration: currentSum,
                diff: Math.abs(currentSum - targetSeconds)
            };
        }
    }
    
    return {
        tracks: bestResult.tracks,
        totalDuration: bestResult.totalDuration,
        accuracy: bestResult.diff
    };
};

// Перемешивание массива
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Создание плейлиста по жанру и времени (используя твой алгоритм)
const createPlaylistByGenre = async (genre, targetMinutes) => {
    const tracks = await loadTracks();
    
    // Фильтрация по жанру
    const filteredTracks = tracks.filter(track => 
        track.genre && track.genre.toLowerCase() === genre.toLowerCase()
    );
    
    console.log(`Найдено ${filteredTracks.length} треков в жанре "${genre}"`);
    
    if (filteredTracks.length === 0) {
        throw new Error(`Жанр "${genre}" не найден в датасете`);
    }
    
    // Запускаем улучшенный алгоритм подбора (ТОЧНО ТАКОЙ ЖЕ КАК В ТВОЕМ КОДЕ)
    const result = generateOptimized(filteredTracks, targetMinutes);

    if (result.tracks.length === 0) {
        throw new Error('Не удалось подобрать треки');
    }

    const actualMinutes = (result.totalDuration / 60).toFixed(2);
    const accuracyMinutes = Math.abs(result.totalDuration / 60 - targetMinutes).toFixed(2);
    
    console.log(`✅ Алгоритм подобрал ${result.tracks.length} треков, сумма: ${actualMinutes} мин, цель: ${targetMinutes} мин, разница: ±${accuracyMinutes} мин`);
    
    const totalDurationSec = result.totalDuration;
    const totalMinutes = Math.floor(totalDurationSec / 60);
    const remainingSec = totalDurationSec % 60;
    
    return {
        id: Date.now(),
        name: `${genre} плейлист на ${targetMinutes} мин`,
        genre: genre,
        target_minutes: targetMinutes,
        tracks: result.tracks,
        total_duration_seconds: totalDurationSec,
        total_duration_display: `${totalMinutes}:${remainingSec.toString().padStart(2, '0')}`,
        tracks_count: result.tracks.length,
        accuracy: {
            target: targetMinutes,
            actual: parseFloat(actualMinutes),
            difference: parseFloat(accuracyMinutes),
            isAccurate: parseFloat(accuracyMinutes) <= 1.0
        }
    };
};

module.exports = { loadTracks, getGenres, createPlaylistByGenre };