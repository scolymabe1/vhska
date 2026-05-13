// Подключаемся к Alpine.js и создаём компонент для страницы фильма
document.addEventListener('alpine:init', () => {
    Alpine.data('moviePage', () => ({
        // Данные фильма, которые будем загружать
        movie: null,
        // Ссылка на iframe для плеера
        iframeLink: '',

        // Функция, которая запускается при загрузке страницы
        async init() {
            // Получаем id фильма из URL (например, ?id=123 или ?kp=123)
            const urlParams = new URLSearchParams(window.location.search);
            const movieId = urlParams.get('id') || urlParams.get('kp') || urlParams.get('kinopoisk_id');

            // Если id нет, ничего не делаем
            if (!movieId) {
                console.log('Нет ID фильма в URL');
                return;
            }

            // Сначала получим данные фильма через API Кинопоиска (как на главной)
            try {
                const kpResponse = await fetch(
                    `https://kinopoiskapiunofficial.tech/api/v2.2/films/${encodeURIComponent(movieId)}`,
                    {
                        headers: {
                            'X-API-KEY': '29070f74-af77-46bc-a8b9-89ef73a7684c'
                        }
                    }
                );

                if (!kpResponse.ok) {
                    throw new Error(`Kinopoisk API HTTP: ${kpResponse.status}`);
                }

                const film = await kpResponse.json();

                // Маппинг полей, чтобы movie.html оставался без изменений
                this.movie = {
                    name: film.nameRu || film.nameOriginal || film.nameEn || 'Без названия',
                    poster: film.posterUrl && film.posterUrl !== 'https://kinopoiskapiunofficial.tech/images/posters/kp/no-poster.png' ? film.posterUrl : 'images/no_poster.png',
                    year: film.year,
                    kinopoisk: film.ratingKinopoisk || film.rating || '',
                    description: film.description || film.shortDescription || ''
                };
            } catch (error) {
                console.error('Ошибка при получении данных из Kinopoisk API:', error);
                // Не прерываем — попробуем всё равно получить плеер из стороннего API
                this.movie = this.movie || null;
            }

            // Плеер остаётся прежним: пытаемся получить iframe ссылку из apicollaps, затем fallback на alloha
            try {
                const apicToken = 'eedefb541aeba871dcfc756e6b31c02e';
                const apicRes = await fetch(`https://apicollaps.cc/list?token=${apicToken}&kinopoisk_id=${encodeURIComponent(movieId)}`);
                if (apicRes.ok) {
                    const apicData = await apicRes.json();
                    const apicMovie = Array.isArray(apicData?.results) && apicData.results.length ? apicData.results[0] : null;

                    if (apicMovie) {
                        if (apicMovie.seasons) {
                            const seasonKeys = Object.keys(apicMovie.seasons)
                                .map(Number)
                                .filter(Number.isFinite)
                                .sort((a, b) => a - b);

                            const firstSeason = apicMovie.seasons[String(seasonKeys[0])];

                            if (firstSeason?.episodes) {
                                const episodeKeys = Object.keys(firstSeason.episodes)
                                    .map(Number)
                                    .filter(Number.isFinite)
                                    .sort((a, b) => a - b);

                                const firstEpisode = firstSeason.episodes[String(episodeKeys[0])];
                                this.iframeLink = firstEpisode?.iframe || firstEpisode?.iframe_url || firstSeason?.iframe || firstSeason?.iframe_url || '';
                            } else {
                                this.iframeLink = firstSeason?.iframe || firstSeason?.iframe_url || '';
                            }
                        } else {
                            this.iframeLink = apicMovie.iframe_url || apicMovie.iframe || apicMovie.iframe_link || '';
                        }
                    }
                }
            } catch (err) {
                console.warn('apicollaps error, trying alloha:', err);
            }

            // Фоллбек: alloha (старый источник плеера)
            if (!this.iframeLink) {
                try {
                    const res = await fetch(`https://api.alloha.tv/?token=04941a9a3ca3ac16e2b4327347bbc1&kp=${encodeURIComponent(movieId)}`);
                    if (res.ok) {
                        const data = await res.json();
                        const aMovie = data.data || null;
                        if (aMovie) {
                            if (aMovie.seasons) {
                                const seasonKeys = Object.keys(aMovie.seasons)
                                    .map(Number)
                                    .filter(Number.isFinite)
                                    .sort((a, b) => a - b);

                                const firstSeason = aMovie.seasons[String(seasonKeys[0])];

                                if (firstSeason?.episodes) {
                                    const episodeKeys = Object.keys(firstSeason.episodes)
                                        .map(Number)
                                        .filter(Number.isFinite)
                                        .sort((a, b) => a - b);

                                    const firstEpisode = firstSeason.episodes[String(episodeKeys[0])];
                                    this.iframeLink = firstEpisode?.iframe || firstSeason?.iframe || '';
                                } else {
                                    this.iframeLink = firstSeason?.iframe || '';
                                }
                            } else {
                                this.iframeLink = aMovie.iframe || '';
                            }
                        }
                    }
                } catch (err) {
                    console.error('Ошибка при получении плеера из alloha:', err);
                }
            }
        }
    }));
});
