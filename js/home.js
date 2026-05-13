// Подключаемся к Alpine.js и создаём компонент для главной страницы
document.addEventListener('alpine:init', () => {
    Alpine.data('home', () => ({

        // Массив для хранения списка фильмов
        movies: [],
        // Массив для хранения списка сериалов
        films: [],
        // Данные блока hero
        heroMovie: null,
        // Текущая страница для загрузки сериалов (начинаем с 1)
        page: 1,
        // Текущая страница для загрузки фильмов (начинаем с 1)
        filmsPage: 1,
        // Массив для мультфильмов
        cartoons: [],
        // Текущая страница для загрузки мультфильмов
        cartoonsPage: 1,
        // Флаг, показывающий, идёт ли сейчас загрузка мультфильмов
        cartoonsLoading: false,
        // Флаг, есть ли ещё мультфильмы для загрузки
        cartoonsHasMore: true,
        // Флаг, показывающий, идёт ли сейчас загрузка сериалов
        isLoading: false,
        // Флаг, показывающий, идёт ли сейчас загрузка фильмов
        filmsLoading: false,
        // Флаг, есть ли ещё сериалы для загрузки
        hasMore: true,
        // Флаг, есть ли ещё фильмы для загрузки
        filmsHasMore: true,

        // Функция, которая запускается при загрузке страницы
        async init() {
            // Сразу загружаем первую порцию фильмов и сериалов
            await this.loadFilms();
            await this.loadSeries();
            // Выбираем случайный герой из загруженных фильмов/сериалов
            await this.pickRandomHero();
            await this.loadCartoons();
        },

        // Функция для загрузки следующей порции сериалов
        async loadSeries() {
            // Если уже загружаем или больше нет сериалов, выходим
            if (this.isLoading || !this.hasMore) {
                return;
            }

            // Устанавливаем флаг загрузки
            this.isLoading = true;

            try {
                // Делаем запрос к API Кинопоиска для получения сериалов
                const response = await fetch(
                    `https://kinopoiskapiunofficial.tech/api/v2.2/films?order=NUM_VOTE&type=TV_SERIES&ratingFrom=0&ratingTo=10&yearFrom=1000&yearTo=3000&page=${this.page}`,
                    {
                        headers: {
                            // Добавляем API-ключ в заголовки, как в requests
                            "X-API-KEY": '29070f74-af77-46bc-a8b9-89ef73a7684c'
                        }
                    }
                );

                // Проверяем, что запрос прошёл успешно
                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }

                // Преобразуем ответ в JSON
                const data = await response.json();

                // Если нет элементов или массив пустой, больше сериалов нет
                if (!data.items || data.items.length === 0) {
                    this.hasMore = false;
                    return;
                }

                // Добавляем новые сериалы в массив
                // Преобразуем данные из API в нужный формат
                const newMovies = data.items.map(movie => ({
                    id: movie.kinopoiskId,  // ID фильма
                    name: movie.nameRu || movie.nameOriginal,  // Название (русское или оригинальное)
                    poster: movie.posterUrl && movie.posterUrl !== 'https://kinopoiskapiunofficial.tech/images/posters/kp/no-poster.png' ? movie.posterUrl : 'images/no_poster.png',  // Ссылка на постер (с fallback)
                    year: movie.year,  // Год выпуска
                    rating: movie.ratingKinopoisk,  // Рейтинг
                    genre: movie.genres?.map(g => g.genre).join(", ") || "",  // Жанры через запятую
                    type: movie.type,  // Тип (фильм, сериал и т.д.)
                    description: movie.description || movie.shortDescription || "" // Описание для hero
                }));

                // Добавляем новые сериалы к существующим
                this.movies.push(...newMovies);

                // Переходим к следующей странице
                this.page++;

            } catch (error) {
                // Если произошла ошибка, выводим её в консоль
                console.error("Ошибка при загрузке сериалов:", error);
            } finally {
                // В любом случае снимаем флаг загрузки
                this.isLoading = false;
            }
        },

        // Функция для загрузки следующей порции фильмов
        async loadFilms() {
            // Если уже загружаем или больше нет фильмов, выходим
            if (this.filmsLoading || !this.filmsHasMore) {
                return;
            }

            // Устанавливаем флаг загрузки
            this.filmsLoading = true;

            try {
                // Делаем запрос к API Кинопоиска для получения фильмов
                const response = await fetch(
                    `https://kinopoiskapiunofficial.tech/api/v2.2/films?order=NUM_VOTE&type=FILM&ratingFrom=0&ratingTo=10&yearFrom=1000&yearTo=3000&page=${this.filmsPage}`,
                    {
                        headers: {
                            // Добавляем API-ключ в заголовки, как в requests
                            "X-API-KEY": "29070f74-af77-46bc-a8b9-89ef73a7684c"
                        }
                    }
                );

                // Проверяем, что запрос прошёл успешно
                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }

                // Преобразуем ответ в JSON
                const data = await response.json();

                // Если нет элементов или массив пустой, больше фильмов нет
                if (!data.items || data.items.length === 0) {
                    this.filmsHasMore = false;
                    return;
                }

                // Добавляем новые фильмы в массив
                // Преобразуем данные из API в нужный формат
                const newFilms = data.items.map(movie => ({
                    id: movie.kinopoiskId,  // ID фильма
                    name: movie.nameRu || movie.nameOriginal,  // Название (русское или оригинальное)
                    poster: movie.posterUrl && movie.posterUrl !== 'https://kinopoiskapiunofficial.tech/images/posters/kp/no-poster.png' ? movie.posterUrl : 'images/no_poster.png',  // Ссылка на постер (с fallback)
                    year: movie.year,  // Год выпуска
                    rating: movie.ratingKinopoisk,  // Рейтинг
                    genre: movie.genres?.map(g => g.genre).join(", ") || "",  // Жанры через запятую
                    type: movie.type,  // Тип (фильм, сериал и т.д.)
                    description: movie.description || movie.shortDescription || "" // Описание для hero
                }));

                // Добавляем новые фильмы к существующим
                this.films.push(...newFilms);

                // Переходим к следующей странице
                this.filmsPage++;

            } catch (error) {
                // Если произошла ошибка, выводим её в консоль
                console.error("Ошибка при загрузке фильмов:", error);
            } finally {
                // В любом случае снимаем флаг загрузки
                this.filmsLoading = false;
            }
        },

        // Функция для загрузки следующей порции мультфильмов (жанр 18)
        async loadCartoons() {
            if (this.cartoonsLoading || !this.cartoonsHasMore) {
                return;
            }

            this.cartoonsLoading = true;

            try {
                const response = await fetch(
                    `https://kinopoiskapiunofficial.tech/api/v2.2/films?genres=18&order=NUM_VOTE&type=ALL&ratingFrom=0&ratingTo=10&yearFrom=1000&yearTo=3000&page=${this.cartoonsPage}`,
                    {
                        headers: {
                            "X-API-KEY": "29070f74-af77-46bc-a8b9-89ef73a7684c"
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }

                const data = await response.json();

                if (!data.items || data.items.length === 0) {
                    this.cartoonsHasMore = false;
                    return;
                }

                const newCartoons = data.items.map(movie => ({
                    id: movie.kinopoiskId,
                    name: movie.nameRu || movie.nameOriginal,
                    poster: movie.posterUrl && movie.posterUrl !== 'https://kinopoiskapiunofficial.tech/images/posters/kp/no-poster.png' ? movie.posterUrl : 'images/no_poster.png',
                    year: movie.year,
                    rating: movie.ratingKinopoisk,
                    genre: movie.genres?.map(g => g.genre).join(", ") || "",
                    type: movie.type,
                    description: movie.description || movie.shortDescription || ""
                }));

                this.cartoons.push(...newCartoons);
                this.cartoonsPage++;

            } catch (error) {
                console.error("Ошибка при загрузке мультфильмов:", error);
            } finally {
                this.cartoonsLoading = false;
            }
        },

        // Выбрать случайный hero из загруженных фильмов и сериалов
        async pickRandomHero() {
            try {
                const pool = [...(this.films || []), ...(this.movies || [])];
                if (!pool || pool.length === 0) {
                    // Попробуем взять из мультфильмов как запасной вариант
                    if (this.cartoons && this.cartoons.length > 0) {
                        this.heroMovie = this.cartoons[Math.floor(Math.random() * this.cartoons.length)];
                        await this.loadHeroDetails(this.heroMovie.id);
                    }
                    return;
                }

                this.heroMovie = pool[Math.floor(Math.random() * pool.length)];
                await this.loadHeroDetails(this.heroMovie.id);
            } catch (err) {
                console.error('Ошибка при выборе случайного hero:', err);
            }
        },

        // Функция для открытия страницы фильма
        openMovie(movie) {
            // Перенаправляем на страницу фильма с ID в URL
            window.location.href = `movie.html?id=${movie.id}`;
        },

        // Загружаем подробное описание для hero из Kinopoisk API
        async loadHeroDetails(movieId) {
            try {
                const response = await fetch(
                    `https://kinopoiskapiunofficial.tech/api/v2.2/films/${movieId}`,
                    {
                        headers: {
                            'X-API-KEY': '29070f74-af77-46bc-a8b9-89ef73a7684c'
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }

                const film = await response.json();

                if (!film) {
                    return;
                }

                // Маппинг для преобразования ratingAgeLimits в читаемый формат
                const ageMapping = {
                    'age0': '0+',
                    'age6': '6+',
                    'age12': '12+',
                    'age16': '16+',
                    'age18': '18+'
                };

                this.heroMovie = {
                    ...this.heroMovie,
                    name: film.nameRu || film.nameOriginal || this.heroMovie.name,
                    description: film.shortDescription || this.heroMovie.description,
                    ageRating: ageMapping[film.ratingAgeLimits] || this.heroMovie.ageRating,
                    poster: film.posterUrl && film.posterUrl !== 'https://kinopoiskapiunofficial.tech/images/posters/kp/no-poster.png'
                        ? film.posterUrl
                        : this.heroMovie.poster
                };
            } catch (error) {
                console.error('Ошибка при загрузке описания hero:', error);
            }
        }
    }));
});
