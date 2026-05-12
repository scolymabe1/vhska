// Подключаемся к Alpine.js и создаём компонент для страницы мультфильмов
document.addEventListener('alpine:init', () => {
    Alpine.data('cartoonsPage', () => ({

        // Массив для хранения списка мультфильмов
        cartoons: [],
        // Текущая страница для загрузки (начинаем с 1)
        page: 1,
        // Флаг, показывающий, идёт ли сейчас загрузка
        isLoading: false,
        // Флаг, есть ли ещё мультфильмов для загрузки
        hasMore: true,

        // Функция, которая запускается при загрузке страницы
        async init() {
            // Сразу загружаем первую порцию
            await this.loadMore();
        },

        // Функция для загрузки следующей порции мультфильмов
        async loadMore() {
            if (this.isLoading || !this.hasMore) return;
            this.isLoading = true;

            try {
                const response = await fetch(
                    `https://kinopoiskapiunofficial.tech/api/v2.2/films?genres=18&order=NUM_VOTE&type=ALL&ratingFrom=0&ratingTo=10&yearFrom=1000&yearTo=3000&page=${this.page}`,
                    {
                        headers: {
                            "X-API-KEY": "c550bd9c-a247-40da-b14d-469cc15c8c0b"
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error(`Ошибка HTTP: ${response.status}`);
                }

                const data = await response.json();

                if (!data.items || data.items.length === 0) {
                    this.hasMore = false;
                    return;
                }

                const newItems = data.items.map(movie => ({
                    id: movie.kinopoiskId,
                    name: movie.nameRu || movie.nameOriginal,
                    poster: movie.posterUrl && movie.posterUrl !== 'https://kinopoiskapiunofficial.tech/images/posters/kp/no-poster.png' ? movie.posterUrl : 'images/no_poster.png',
                    year: movie.year,
                    rating: movie.ratingKinopoisk,
                    genre: movie.genres?.map(g => g.genre).join(", ") || "",
                    type: movie.type,
                    description: movie.description || movie.shortDescription || ""
                }));

                this.cartoons.push(...newItems);
                this.page++;

            } catch (error) {
                console.error("Ошибка при загрузке мультфильмов:", error);
            } finally {
                this.isLoading = false;
            }
        },

        // Функция для открытия страницы фильма
        openMovie(item) {
            window.location.href = `movie.html?id=${item.id}`;
        }
    }));
});
