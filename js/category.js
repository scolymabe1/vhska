document.addEventListener('alpine:init', () => {
    Alpine.data('catalogPage', () => ({
        movies: [],
        categoryTitle: 'Загрузка...',
        isLoading: false,
        currentPage: 1,
        totalPages: 1,

        async init() {
            // Метод init() запускается автоматически при открытии страницы.
            // Мы сразу вызываем функцию загрузки фильмов.
            await this.fetchMovies();
        },

        async fetchMovies() {
            // 1. Получаем ключ категории из URL браузера (например, ?cat=top250). 
            // Если в URL ничего нет, по умолчанию откроется категория 'popular'.
            const urlParams = new URLSearchParams(window.location.search);
            const catKey = urlParams.get('cat') || 'popular';

            // 2. Достаем настройки выбранной категории из глобального объекта CATEGORIES (из config.js)
            const currentCat = CATEGORIES[catKey] || CATEGORIES['popular'];
            this.categoryTitle = currentCat.title;

            this.isLoading = true;

            // 3. Собираем правильный URL запроса, используя вспомогательную функцию getKinopoiskUrl из config.js
            const urlQuery = currentCat.path + currentCat.type + '&page=' + this.currentPage;
            const apiUrl = getKinopoiskUrl(urlQuery);

            // Кэширование по категории+странице (24 часа)
            const CACHE_TTL = 24 * 60 * 60 * 1000;
            const cacheKey = 'vhska_category_' + catKey + '_page_' + this.currentPage + '_cache';
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && parsed.time && (Date.now() - parsed.time < CACHE_TTL)) {
                        // Используем кэшированные данные
                        this.movies = parsed.mappedMovies || [];
                        this.totalPages = parsed.totalPages || 1;
                        this.isLoading = false;
                        return;
                    }
                }
            } catch (err) {
                console.warn('Ошибка чтения кэша категории:', err);
            }

            // 4. Запускаем цикл ротации ключей. Количество попыток равно количеству ключей в API_KEYS
            for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
                try {
                    // Берём текущий активный ключ из глобального индекса window.currentKeyIndex
                    const activeKey = API_KEYS[window.currentKeyIndex];

                    const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                            'X-API-KEY': activeKey,
                            'Content-Type': 'application/json',
                        }
                    });

                    // Если поймали ошибку лимитов (429) или неоплаченного тарифа (402)
                    if (response.status === 429 || response.status === 402) {
                        console.warn('Ключ №' + (window.currentKeyIndex + 1) + ' исчерпал лимит. Смена ключа...');
                        
                        // Переключаем глобальный индекс на следующий ключ по кругу
                        window.currentKeyIndex = (window.currentKeyIndex + 1) % API_KEYS.length;
                        
                        // continue прерывает текущую итерацию цикла и запускает её заново уже с НОВЫМ ключом
                        continue; 
                    }

                    // Если пришла любая другая критическая ошибка (например, 404 или 500)
                    if (!response.ok) {
                        throw new Error('Ошибка сервера Кинопоиска: ' + response.status);
                    }

                    // Если запрос прошёл успешно (статус 200)
                    const data = await response.json();
                    
                    // Раскладываем данные по переменным нашего Alpine-компонента
                    const mapped = (data.items || []).map(film => {
                        const rawRating = film.ratingKinopoisk || film.ratingImdb || film.rating || '—';
                        const formattedRating = typeof rawRating === 'number' ? rawRating.toFixed(1) : rawRating;

                        return {
                            ...film,
                            posterUrlPreview: normalizePoster(film.posterUrlPreview || film.posterUrl || ''),
                            posterUrl: normalizePoster(film.posterUrl || film.posterUrlPreview || ''),
                            cleanType: formatMovieType(film.type),
                            cleanRating: formattedRating
                        };
                    });
                    this.movies = mapped;
                    this.totalPages = data.totalPages || 1;

                    // Сохраняем в localStorage (мягкий кэш)
                    try {
                        const toSave = {
                            time: Date.now(),
                            rawData: data,
                            mappedMovies: mapped,
                            totalPages: this.totalPages
                        };
                        localStorage.setItem(cacheKey, JSON.stringify(toSave));
                    } catch (err) {
                        console.warn('Не удалось сохранить кэш категории:', err);
                    }
                    
                    this.isLoading = false;
                    return; // Успешно выходим из всей функции fetchMovies

                } catch (err) {
                    console.error('Ошибка при попытке запроса:', err);
                    // При сетевой ошибке тоже переключаем ключ на следующий для подстраховки
                    window.currentKeyIndex = (window.currentKeyIndex + 1) % API_KEYS.length;
                }
            }

            // Если цикл завершился, но функция не завершилась через return выше — значит, все ключи мертвы
            this.isLoading = false;
            this.categoryTitle = 'Все доступные API-ключи исчерпали лимиты запросов';
        },

        // Функция для перехода на следующую страницу
        async nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                await this.fetchMovies();
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Плавно скроллим пользователя наверх
            }
        },

        // Функция для возврата на предыдущую страницу
        async prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                await this.fetchMovies();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }));
});
