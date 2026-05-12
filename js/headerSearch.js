document.addEventListener('alpine:init', () => {
    Alpine.data('headerSearch', () => ({
        q: '',
        suggestions: [],
        isOpen: false,
        highlightedIndex: -1,
        isLoading: false,
        debounceTimer: null,

        init() {
            // Если в URL есть q, подставим в поле
            const params = new URLSearchParams(window.location.search);
            const q = params.get('q');
            if (q) {
                this.q = q;
            }
        },

        onInput() {
            this.isOpen = !!this.q && this.q.length >= 2;
            clearTimeout(this.debounceTimer);
            if (!this.isOpen) {
                this.suggestions = [];
                return;
            }
            this.debounceTimer = setTimeout(() => this.fetchSuggestions(), 300);
        },

        async fetchSuggestions() {
            if (!this.q || this.q.length < 2) return;
            this.isLoading = true;

            try {
                const url = `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(this.q)}&page=1`;
                const res = await fetch(url, { headers: { 'X-API-KEY': 'c550bd9c-a247-40da-b14d-469cc15c8c0b' } });
                if (!res.ok) {
                    this.suggestions = [];
                    this.isOpen = true;
                    return;
                }

                const data = await res.json();
                let items = [];

                if (Array.isArray(data.films)) {
                    items = data.films.map(m => ({
                        id: m.filmId || m.filmId,
                        name: m.nameRu || m.nameOriginal || m.nameEn || 'Без названия',
                        poster: m.posterUrl || m.posterUrlPreview || 'images/no_poster.png',
                        year: m.year,
                        type: m.type || ''
                    }));
                } else if (Array.isArray(data.items)) {
                    items = data.items.map(m => ({
                        id: m.kinopoiskId || m.filmId,
                        name: m.nameRu || m.nameOriginal || 'Без названия',
                        poster: m.posterUrl || m.posterUrlPreview || 'images/no_poster.png',
                        year: m.year,
                        type: m.type || ''
                    }));
                }

                this.suggestions = items.slice(0, 8);
                this.isOpen = this.suggestions.length > 0;
                this.highlightedIndex = -1;
            } catch (err) {
                console.error('header search error:', err);
                this.suggestions = [];
                this.isOpen = false;
            } finally {
                this.isLoading = false;
            }
        },

        highlight(delta) {
            if (!this.suggestions.length) return;
            if (delta === 1) {
                if (this.highlightedIndex < this.suggestions.length - 1) this.highlightedIndex++;
                else this.highlightedIndex = 0;
            } else if (delta === -1) {
                if (this.highlightedIndex > 0) this.highlightedIndex--;
                else this.highlightedIndex = this.suggestions.length - 1;
            }
            this.isOpen = true;
        },

        enterKey() {
            if (this.highlightedIndex >= 0 && this.highlightedIndex < this.suggestions.length) {
                this.select(this.suggestions[this.highlightedIndex]);
            } else {
                this.onSubmit();
            }
        },

        select(item) {
            // Перейдём на movie.html с ID
            if (!item || !item.id) return;
            window.location.href = `movie.html?id=${item.id}`;
        },

        onSubmit() {
            if (this.highlightedIndex >= 0 && this.highlightedIndex < this.suggestions.length) {
                this.select(this.suggestions[this.highlightedIndex]);
            } else if (this.q) {
                window.location.href = `search.html?q=${encodeURIComponent(this.q)}`;
            }
        }
    }));
});