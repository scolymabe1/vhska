document.addEventListener('alpine:init', () => {
    Alpine.data('homePage', () => ({
        movies: [],
        series: [],
        cartoons: [],
        heroMovie: null,
        isLoading: false,

        async init() {
            // 1. Проверяем, есть ли уже сохраненная главная страница в памяти браузера
            const cachedData = localStorage.getItem('vhska_home_cache');
            const cachedTime = localStorage.getItem('vhska_home_cache_time');
            
            // Если данные есть и им меньше 24 часов (86400000 миллисекунд)
            if (cachedData && cachedTime && (Date.now() - cachedTime < 86400000)) {
                const parsed = JSON.parse(cachedData);
                
                // Моментально заполняем сайт из кэша (0 запросов к API!)
                this.movies = parsed.movies;
                this.series = parsed.series;
                this.cartoons = parsed.cartoons;
                this.heroMovie = parsed.heroMovie;
                return; 
            }

            // 2. Если кэша нет или он устарел — запускаем обычную загрузку
            this.isLoading = true;
            
            // Качаем списки
            await Promise.all([
                this.loadSection('movies', '/api/v2.2/films?order=NUM_VOTE&type=FILM&page=1'),
                this.loadSection('series', '/api/v2.2/films?order=NUM_VOTE&type=TV_SERIES&page=1'),
                this.loadSection('cartoons', '/api/v2.2/films?genres=18&order=NUM_VOTE&type=FILM&page=1')
            ]);

            // Выбираем случайный фильм для Hero
            if (this.movies.length > 0) {
                const randomIndex = Math.floor(Math.random() * this.movies.length);
                const chosenShortMovie = this.movies[randomIndex];
                await this.loadHeroDetails(chosenShortMovie.kinopoiskId);
            }

            // 3. Сохраняем всё, что накачали, в кэш
            const dataToCache = {
                movies: this.movies,
                series: this.series,
                cartoons: this.cartoons,
                heroMovie: this.heroMovie
            };
            localStorage.setItem('vhska_home_cache', JSON.stringify(dataToCache));
            localStorage.setItem('vhska_home_cache_time', Date.now().toString());

            this.isLoading = false;
        },

        async loadSection(variableName, apiPath) {
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
                    
                    this[variableName] = (data.items || []).slice(0, 10).map(film => {
                        const rawRating = film.ratingKinopoisk || film.ratingImdb || film.rating || '—';
                        const formattedRating = typeof rawRating === 'number' ? rawRating.toFixed(1) : rawRating;
                        const genresString = (film.genres || []).map(g => g.genre).join(', ');

                        let ageLabel = '12+';
                        if (variableName === 'cartoons') ageLabel = '6+';
                        if (film.ratingAgeLimits && film.ratingAgeLimits !== 'age0') {
                            ageLabel = film.ratingAgeLimits.replace('age', '') + '+';
                        }

                        return {
                            ...film,
                            posterUrlPreview: normalizePoster(film.posterUrlPreview || film.posterUrl || ''),
                            posterUrl: normalizePoster(film.posterUrl || film.posterUrlPreview || ''),
                            cleanType: formatMovieType(film.type),
                            cleanRating: formattedRating,
                            cleanGenres: genresString || 'Кино',
                            cleanAge: ageLabel
                        };
                    });
                    return;
                } catch (err) {
                    console.error('Сбой секции:', err);
                    window.currentKeyIndex = (window.currentKeyIndex + 1) % API_KEYS.length;
                }
            }
        },

        async loadHeroDetails(id) {
            const apiUrl = getKinopoiskUrl('/api/v2.2/films/' + id);
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

                    const film = await response.json();
                    const rawRating = film.ratingKinopoisk || film.ratingImdb || film.rating || '—';
                    const formattedRating = typeof rawRating === 'number' ? rawRating.toFixed(1) : rawRating;
                    const genresString = (film.genres || []).map(g => g.genre).join(', ');
                    const ageLabel = film.ratingAgeLimits ? film.ratingAgeLimits.replace('age', '') + '+' : '12+';

                    this.heroMovie = {
                        ...film,
                        posterUrl: normalizePoster(film.posterUrl || film.posterUrlPreview || ''),
                        posterUrlPreview: normalizePoster(film.posterUrlPreview || film.posterUrl || ''),
                        cleanType: formatMovieType(film.type),
                        cleanRating: formattedRating,
                        cleanGenres: genresString || 'Кино',
                        cleanAge: ageLabel,
                        description: film.description || film.shortDescription || 'Описание временно отсутствует.'
                    };
                    return;
                } catch (err) {
                    console.error('Сбой Hero:', err);
                    window.currentKeyIndex = (window.currentKeyIndex + 1) % API_KEYS.length;
                }
            }
        }
    }));
});
