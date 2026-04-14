/**
 * АЛГОРИТМ ИНТЕЛЛЕКТУАЛЬНОГО ПОДБОРА (v4.0 - МАКСИМАЛЬНАЯ ТОЧНОСТЬ)
 * 
 * Приоритеты:
 * 1. МАКСИМАЛЬНАЯ ТОЧНОСТЬ (близко к целевому времени)
 * 2. Разнообразие через рандомизацию
 * 3. Сохранение порядка блоков в мультижанровых плейлистах
 */

class PlaylistAlgorithm {
    /**
     * Оптимальный подбор треков для плейлиста
     */
    generateOptimized(tracks, targetMinutes) {
        if (!tracks || tracks.length === 0) {
            return { tracks: [], totalDuration: 0, accuracy: 0 };
        }

        const targetSeconds = targetMinutes * 60;
        
        let bestResult = { tracks: [], totalDuration: 0, diff: Infinity };
        const attempts = 200;
        
        for (let attempt = 0; attempt < attempts; attempt++) {
            const shuffled = this.shuffleArray([...tracks]);
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
        
        // Не перемешиваем треки внутри блока (сохраняем порядок подбора)
        // Но для разнообразия между попытками используем shuffle в начале
        
        return {
            tracks: bestResult.tracks,
            totalDuration: bestResult.totalDuration,
            accuracy: bestResult.diff
        };
    }

    /**
     * Для мультижанровых плейлистов - подбор с учетом истории
     */
    generateOptimizedForBlock(tracks, targetMinutes, previousTrackIds = new Set()) {
        if (!tracks || tracks.length === 0) {
            return { tracks: [], totalDuration: 0, accuracy: 0 };
        }

        // Фильтруем уже использованные треки (мягко, чтобы не остаться без треков)
        let availableTracks = tracks;
        if (previousTrackIds.size > 0 && tracks.length > 10) {
            const filtered = tracks.filter(track => !previousTrackIds.has(track.id));
            if (filtered.length >= Math.min(5, tracks.length)) {
                availableTracks = filtered;
            }
        }
        
        const result = this.generateOptimized(availableTracks, targetMinutes);
        
        return {
            tracks: result.tracks,
            totalDuration: result.totalDuration,
            accuracy: result.accuracy
        };
    }

    /**
     * Перемешивание массива
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

module.exports = new PlaylistAlgorithm();