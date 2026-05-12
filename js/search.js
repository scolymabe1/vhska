document.addEventListener('alpine:init', () => {
    Alpine.data('searchPage', () => ({
        query: '',
        results: [],
        page: 1,
        isLoading: false,
        hasMore: true,

        init() {
            const params = new URLSearchParams(window.location.search);
            this.query = params.get('q') || '';

            // Поставим значение в хедере (если форма в header есть)
            const headerInput = document.querySelector('form[action="search.html"] input[name="q"]');
            if (headerInput) headerInput.value = this.query;

            if (this.query) {
                this.loadMore();
            }
        },

        async loadMore() {
            if (this.isLoading || !this.hasMore) return;
            if (!this.query) return;

            this.isLoading = true;

            try {
                // Сначала пробуем v2.1 search-by-keyword
                const urlV21 = `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(this.query)}&page=${this.page}`;
                const res1 = await fetch(urlV21, {
                    headers: { 'X-API-KEY': 'c550bd9c-a247-40da-b14d-469cc15c8c0b' }
                });

                if (res1.ok) {
                    const json1 = await res1.json();
                    if (Array.isArray(json1.films)) {
                        const newItems = json1.films.map(m => ({
                            id: m.filmId || m.kinopoiskId,
                            name: m.nameRu || m.nameOriginal || m.nameEn || 'Без названия',
                            poster: m.posterUrl || m.posterUrlPreview || 'images/no_poster.png',
                            year: m.year,
                            rating: m.ratingKinopoisk || m.rating || '',
                            genre: (m.genres && m.genres.map(g => g.genre).join(', ')) || '',
                            type: m.type || ''
                        }));

                        this.results.push(...newItems);

                        if (typeof json1.pagesCount === 'number') {
                            this.hasMore = this.page < json1.pagesCount;
                        } else {
                            this.hasMore = newItems.length > 0;
                        }

                        this.page++;
                        return;
                    }
                }

                // Альтернативный вариант: v2.2 films?keyword=
                const urlV22 = `https://kinopoiskapiunofficial.tech/api/v2.2/films?keyword=${encodeURIComponent(this.query)}&page=${this.page}`;
                const res2 = await fetch(urlV22, {
                    headers: { 'X-API-KEY': 'c550bd9c-a247-40da-b14d-469cc15c8c0b' }
                });

                if (res2.ok) {
                    const json2 = await res2.json();
                    if (Array.isArray(json2.items)) {
                        const newItems = json2.items.map(m => ({
                            id: m.kinopoiskId || m.filmId,
                            name: m.nameRu || m.nameOriginal || m.nameEn || 'Без названия',
                            poster: m.posterUrl || m.posterUrlPreview || 'images/no_poster.png',
                            year: m.year,
                            rating: m.ratingKinopoisk || m.rating || '',
                            genre: m.genres?.map(g => g.genre).join(', ') || '',
                            type: m.type || ''
                        }));

                        this.results.push(...newItems);
                        this.hasMore = json2.items.length > 0;
                        this.page++;
                        return;
                    }
                }

                // Если ничего не помогло
                this.hasMore = false;
            } catch (err) {
                console.error('Ошибка поиска:', err);
                this.hasMore = false;
            } finally {
                this.isLoading = false;
            }
        },

        openMovie(item) {
            // Перенаправляем на movie.html с ID
            window.location.href = `movie.html?id=${item.id}`;
        }
    }));
});