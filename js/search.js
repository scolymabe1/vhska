document.addEventListener('alpine:init', () => {
    Alpine.data('searchPage', () => ({
        query: '',
        results: [],
        isLoading: false,
        page: 1,
        totalPages: 1,

        async init() {
            const urlParams = new URLSearchParams(window.location.search);
            this.query = urlParams.get('q') || '';
            if (this.query) await this.fetchSearch();
        },

        async fetchSearch() {
            if (!this.query.trim()) {
                this.results = [];
                return;
            }

            this.isLoading = true;

            for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
                try {
                    const apiPath = '/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(this.query) + '&page=' + this.page;
                    const apiUrl = getKinopoiskUrl(apiPath);
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

                    // Try several possible shapes returned by different endpoints
                    const items = data.films || data.items || data.results || [];

                    this.results = (items || []).map(film => {
                        const id = film.kinopoiskId || film.filmId || film.id || film.id_kp || film.kinopoiskId;
                        const nameRu = film.nameRu || film.name || film.title || film.nameOriginal || film.name_en;
                        const poster = normalizePoster(film.posterUrlPreview || film.poster || film.posterUrl || film.poster_preview || '');
                        const year = film.year || film.releaseYear || film.premiere || film.premiere_ru || '';
                        const rawRating = film.ratingKinopoisk || film.ratingImdb || film.rating || film.rating_kp;
                        const rating = typeof rawRating === 'number' ? rawRating.toFixed(1) : (rawRating || '—');
                        const genresString = (film.genres || []).map(g => g.genre).join(', ');

                        return {
                            kinopoiskId: id,
                            nameRu,
                            posterUrlPreview: poster,
                            year,
                            cleanType: typeof film.type === 'string' ? formatMovieType(film.type) : '',
                            cleanRating: rating,
                            cleanGenres: genresString
                        };
                    });

                    this.totalPages = data.totalPages || data.pages || 1;
                    this.isLoading = false;
                    return;
                } catch (err) {
                    console.error('Search error:', err);
                    window.currentKeyIndex = (window.currentKeyIndex + 1) % API_KEYS.length;
                }
            }

            this.isLoading = false;
            this.results = [];
        }
    }));
});
