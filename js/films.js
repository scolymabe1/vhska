// Подключаемся к Alpine.js и создаём компонент для страницы фильмов
document.addEventListener('alpine:init', () => {
    Alpine.data('filmsPage', () => ({

        // Массив для хранения списка фильмов
        films: [],
        // Текущая страница для загрузки (начинаем с 1)
        page: 1,
        // Флаг, показывающий, идёт ли сейчас загрузка
        isLoading: false,
        // Флаг, есть ли ещё фильмы для загрузки
        hasMore: true,

        // Функция, которая запускается при загрузке страницы
        async init() {
            // Сразу загружаем первую порцию фильмов
            await this.loadMore();
        },

        // Функция для загрузки следующей порции фильмов
        async loadMore() {
            // Если уже загружаем или больше нет фильмов, выходим
            if (this.isLoading || !this.hasMore) {
                return;
            }

            // Устанавливаем флаг загрузки
            this.isLoading = true;

            try {
                // Делаем запрос к API Кинопоиска для получения фильмов
                const response = await fetch(
                    `https://kinopoiskapiunofficial.tech/api/v2.2/films?order=NUM_VOTE&type=FILM&ratingFrom=0&ratingTo=10&yearFrom=1000&yearTo=3000&page=${this.page}`,
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
                    this.hasMore = false;
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
                    description: movie.description || movie.shortDescription || "" // Описание
                }));

                // Добавляем новые фильмы к существующим
                this.films.push(...newFilms);

                // Переходим к следующей странице
                this.page++;

            } catch (error) {
                // Если произошла ошибка, выводим её в консоль
                console.error("Ошибка при загрузке фильмов:", error);
            } finally {
                // В любом случае снимаем флаг загрузки
                this.isLoading = false;
            }
        },

        // Функция для открытия страницы фильма
        openMovie(movie) {
            // Перенаправляем на страницу фильма с ID в URL
            window.location.href = `movie.html?id=${movie.id}`;
        }
    }));
});
