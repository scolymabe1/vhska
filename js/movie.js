// Подключаемся к Alpine.js и создаём компонент для страницы фильма
document.addEventListener('alpine:init', () => {
    Alpine.data('moviePage', () => ({
        // Данные фильма, которые будем загружать
        movie: null,
        // Ссылка на iframe для плеера
        iframeLink: '',

        // Функция, которая запускается при загрузке страницы
        async init() {
            // Получаем id фильма из URL (например, ?id=123)
            const urlParams = new URLSearchParams(window.location.search);
            const movieId = urlParams.get('id');

            // Если id нет, ничего не делаем
            if (!movieId) {
                console.log('Нет ID фильма в URL');
                return;
            }

            try {
                // Делаем запрос к API для получения данных фильма
                const res = await fetch(
                    `https://api.alloha.tv/?token=04941a9a3ca3ac16e2b4327347bbc1&kp=${movieId}`
                );

                if (!res.ok) {
                    throw new Error(`Ошибка HTTP: ${res.status}`);
                }

                const data = await res.json();

                this.movie = data.data || null;

                if (!this.movie) {
                    console.log('Фильм не найден');
                    return;
                }

                if (this.movie.seasons) {
                    const seasonKeys = Object.keys(this.movie.seasons)
                        .map(Number)
                        .filter(Number.isFinite)
                        .sort((a, b) => a - b);

                    const firstSeason = this.movie.seasons[String(seasonKeys[0])];

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
                    this.iframeLink = this.movie.iframe || '';
                }

            } catch (error) {
                console.error('Ошибка при загрузке фильма:', error);
            }
        }
    }));
});