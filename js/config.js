// 1. Общая база ключей Кинопоиска для всего сайта
const API_KEYS = [
    '29070f74-af77-46bc-a8b9-89ef73a7684c', // Первый ключ
    '396247cc-55fe-4eef-8efa-3ba0bae5cead',               // Второй ключ
    'c550bd9c-a247-40da-b14d-469cc15c8c0b',
    '7019cb79-cb1a-4e5c-ac1c-033ef8f7fc4d' // Третий ключ
];

// 2. Глобальный индекс активного ключа (чтобы все скрипты знали текущий рабочий ключ)
window.currentKeyIndex = 0;

// 3. Единая карта категорий для каталога и ссылок
const CATEGORIES = {
    'movies': { 
        title: 'Все фильмы', 
        path: '/api/v2.2/films?order=NUM_VOTE&type=', 
        type: 'FILM' 
    },
    'series': { 
        title: 'Сериалы', 
        path: '/api/v2.2/films?order=NUM_VOTE&type=',
        type: 'TV_SERIES' 
    },
    'cartoons': { 
        title: 'Мультфильмы', 
        path: '/api/v2.2/films?genres=18&order=NUM_VOTE&type=', 
        type: 'FILM' 
    },

    'popular': { 
        title: 'Популярное сейчас', 
        path: '/api/v2.2/films/collections?type=',
        type: 'TOP_POPULAR_ALL' 
    },
    'pop-movies': {
        title: 'Популярные фильмы',
        path: '/api/v2.2/films/collections?type=',
        type: 'TOP_POPULAR_MOVIES'
    },
    'top250-movies': {
        title: 'Топ 250 фильмов',
        path: '/api/v2.2/films/collections?type=',
        type: 'TOP_250_MOVIES'
    },
    'comics-theme': {
        title: 'По комиксам',
        path: '/api/v2.2/films/collections?type=',
        type: 'COMICS_THEME'
    },
    'family': {
        title: 'Семейное кино',
        path: '/api/v2.2/films/collections?type=',
        type: 'FAMILY'
    },
    'zombie-theme': {
        title: 'Про зомби',
        path: '/api/v2.2/films/collections?type=',
        type: 'ZOMBIE_THEME'
    }
};

// 4. Вспомогательная функция для сборки безопасных ссылок (чтобы не писать домен в каждом файле)
function getKinopoiskUrl(pathWithParams) {
    const domain = 'https://' + 'kinopoiskapiunofficial' + '.tech';
    return domain + pathWithParams;
}

// Добавь это в конец своего js/config.js
function formatMovieType(type) {
    const types = {
        'FILM': 'Фильм',
        'TV_SERIES': 'Сериал',
        'TV_SERIAL': 'Сериал',
        'MINI_SERIES': 'Мини-сериал',
        'TV_SHOW': 'ТВ-Шоу',
        'VIDEO': 'Видео'
    };
    return types[type] || type || 'Кино';
}

// Нормализует URL постера: если это «no-poster» от Kinopoisk — возвращаем локальную заглушку
function normalizePoster(url) {
    if (!url) return 'images/no_poster.png';
    try {
        const s = String(url);
        // Специфичная проверка на стандартный путь no-poster Кинопоиска
        if (s.includes('/images/posters/kp/no-poster.png') || s.endsWith('/no-poster.png') || /no-?poster/i.test(s)) {
            return 'images/no_poster.png';
        }
        return s;
    } catch (err) {
        return 'images/no_poster.png';
    }
}
