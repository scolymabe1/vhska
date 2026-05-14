document.addEventListener('alpine:init', () => {
    Alpine.data('moviePage', () => ({
        movie: null,
        iframeLink: '',
        similars: [],
        rawFilm: null,
        rawSimilars: null,
        loadError: false,

        async init() {
            // 1. Берем ID из адресной строки
            const urlParams = new URLSearchParams(window.location.search);
            const movieId = urlParams.get('id') || urlParams.get('kp');

            if (!movieId) {
                // Нет id в URL — перенаправляем на главную
                window.location.href = 'index.html';
                return;
            }

            // 2. Попробуем восстановить из кэша (24 часа)
            const CACHE_TTL = 24 * 60 * 60 * 1000;
            const cacheKey = 'vhska_movie_' + movieId + '_cache';
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.time && (Date.now() - parsed.time < CACHE_TTL)) {
                        // Используем сохранённые данные
                        this.rawFilm = parsed.rawFilm || null;
                        this.rawSimilars = parsed.rawSimilars || null;
                        if (this.rawFilm) {
                            const f = this.rawFilm;
                            const rawRating = f.ratingKinopoisk || f.ratingImdb || f.rating || '—';
                            const formattedRating = typeof rawRating === 'number' ? rawRating.toFixed(1) : (rawRating || '—');
                            const genresString = (f.genres || []).map(g => g.genre).join(', ');

                            this.movie = {
                                name: f.nameRu || f.nameOriginal || f.name || 'Без названия',
                                poster: normalizePoster(f.posterUrl || f.posterUrlPreview || ''),
                                year: f.year,
                                description: f.description || f.shortDescription || '',
                                cleanType: formatMovieType(f.type),
                                cleanRating: formattedRating,
                                cleanGenres: genresString || '',
                                cleanAge: f.ratingAgeLimits ? f.ratingAgeLimits.replace('age', '') + '+' : '12+'
                            };
                            
                            // Обновляем заголовок страницы
                            document.title = this.movie.name + ' | VHSka';
                        }
                        if (this.rawSimilars) {
                            this.similars = (this.rawSimilars || []).slice(0, 5).map(item => ({
                                kinopoiskId: item.filmId || item.kinopoiskId || item.id,
                                nameRu: item.nameRu || item.name || item.nameOriginal || 'Без названия',
                                posterUrlPreview: normalizePoster(item.posterUrlPreview || item.posterUrl || ''),
                                cleanType: item.type ? formatMovieType(item.type) : 'Фильм',
                                cleanRating: item.ratingKinopoisk ? (typeof item.ratingKinopoisk === 'number' ? item.ratingKinopoisk.toFixed(1) : item.ratingKinopoisk) : '',
                                cleanGenres: (item.genres || []).map(g => g.genre).join(', ') || '',
                                year: item.year || ''
                            }));
                        }
                    }
                }
            } catch (err) {
                console.warn('Ошибка чтения кэша:', err);
            }

            // Если не восстановили из кэша — загружаем с API
            if (!this.movie) {
                try {
                    const apiUrl = getKinopoiskUrl('/api/v2.2/films/' + encodeURIComponent(movieId));
                    let rawFilm = null;
                    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
                        try {
                            const activeKey = API_KEYS[window.currentKeyIndex];
                            const kpResponse = await fetch(apiUrl, {
                                method: 'GET',
                                headers: { 'X-API-KEY': activeKey, 'Content-Type': 'application/json' }
                            });

                            if (kpResponse.status === 429 || kpResponse.status === 402) {
                                window.currentKeyIndex = (window.currentKeyIndex + 1) % API_KEYS.length;
                                continue;
                            }
                            if (!kpResponse.ok) throw new Error('Status: ' + kpResponse.status);

                            rawFilm = await kpResponse.json();
                            const f = rawFilm;
                            const rawRating = f.ratingKinopoisk || f.ratingImdb || f.rating || '—';
                            const formattedRating = typeof rawRating === 'number' ? rawRating.toFixed(1) : (rawRating || '—');
                            const genresString = (f.genres || []).map(g => g.genre).join(', ');

                            this.movie = {
                                name: f.nameRu || f.nameOriginal || f.name || 'Без названия',
                                poster: normalizePoster(f.posterUrl || f.posterUrlPreview || ''),
                                year: f.year,
                                description: f.description || f.shortDescription || '',
                                cleanType: formatMovieType(f.type),
                                cleanRating: formattedRating,
                                cleanGenres: genresString || '',
                                cleanAge: f.ratingAgeLimits ? f.ratingAgeLimits.replace('age', '') + '+' : '12+'
                            };
                            
                            // Обновляем заголовок страницы
                            document.title = this.movie.name + ' | VHSka';

                            this.rawFilm = rawFilm;
                            break;
                        } catch (err) {
                            console.error('Ошибка Кинопоиска:', err);
                            window.currentKeyIndex = (window.currentKeyIndex + 1) % API_KEYS.length;
                        }
                    }
                } catch (err) {
                    console.error('Ошибка загрузки фильма:', err);
                }
            }

            // Если после попыток загрузки фильма данных нет — показываем ошибку (не редирект)
            if (!this.movie) {
                this.loadError = true;
                return;
            }

            // 3. Ищем плеер. Apicollaps
            try {
                const apicRes = await fetch(`https://apicollaps.cc/list?token=eedefb541aeba871dcfc756e6b31c02e&kinopoisk_id=${encodeURIComponent(movieId)}`);
                const apicData = await apicRes.json();
                
                // Просто берем главную ссылку на видео-базу (для фильмов и сериалов она общая)
                if (apicData?.results?.length) {
                    const fileData = apicData.results[0];
                    this.iframeLink = fileData.iframe_url || fileData.iframe || '';
                }
            } catch (err) {
                console.warn('Apicollaps не ответил, пробуем Alloha...');
            }

            // 4. Загружаем похожие фильмы (если не было в кэше)
            if (!this.similars || this.similars.length === 0) {
                await this.fetchSimilars(movieId);
            }

            // Сохраняем в кэш (только данные Kinopoisk)
            try {
                const toSave = {
                    time: Date.now(),
                    rawFilm: this.rawFilm || null,
                    rawSimilars: this.rawSimilars || null,
                    mappedMovie: this.movie || null,
                    mappedSimilars: this.similars || []
                };
                localStorage.setItem(cacheKey, JSON.stringify(toSave));
            } catch (err) {
                console.warn('Не удалось сохранить кэш:', err);
            }
        },

        async fetchSimilars(movieId) {
            if (!movieId) {
                this.similars = [];
                return;
            }

            const apiPath = '/api/v2.2/films/' + encodeURIComponent(movieId) + '/similars';
            const apiUrl = getKinopoiskUrl(apiPath);

            for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
                try {
                    const activeKey = API_KEYS[window.currentKeyIndex];
                    const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: { 'X-API-KEY': activeKey, 'Content-Type': 'application/json' }
                    });

                    if (response.status === 429 || response.status === 402) {
                        window.currentKeyIndex = (window.currentKeyIndex + 1) % API_KEYS.length;
                        continue;
                    }
                    if (!response.ok) throw new Error('Status: ' + response.status);

                    const data = await response.json();
                    const items = data.items || [];

                    // Сохраняем сырьё
                    this.rawSimilars = items;

                    this.similars = items.slice(0, 5).map(item => ({
                        kinopoiskId: item.filmId || item.kinopoiskId || item.id,
                        nameRu: item.nameRu || item.name || item.nameOriginal || 'Без названия',
                        posterUrlPreview: normalizePoster(item.posterUrlPreview || item.posterUrl || ''),
                        cleanType: item.type ? formatMovieType(item.type) : 'Фильм',
                        cleanRating: item.ratingKinopoisk ? (typeof item.ratingKinopoisk === 'number' ? item.ratingKinopoisk.toFixed(1) : item.ratingKinopoisk) : '',
                        cleanGenres: (item.genres || []).map(g => g.genre).join(', ') || '',
                        year: item.year || ''
                    }));
                    return;
                } catch (err) {
                    console.error('Ошибка при загрузке похожих фильмов:', err);
                    window.currentKeyIndex = (window.currentKeyIndex + 1) % API_KEYS.length;
                }
            }

            this.similars = [];
        }
    }));
});
