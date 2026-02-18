/**
 * Search & Filter Module
 * Client-side search across loaded news articles.
 */
const SearchFilter = (() => {
    let debounceTimer = null;
    let isSearchActive = false;

    function init() {
        const input = document.getElementById('searchInput');

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = input.value.trim();
                if (query.length >= 2) {
                    performSearch(query);
                } else if (isSearchActive) {
                    clear();
                }
            }, 300);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                input.value = '';
                clear();
                input.blur();
            }
            if (e.key === 'Enter') {
                clearTimeout(debounceTimer);
                const query = input.value.trim();
                if (query.length >= 2) {
                    performSearch(query);
                }
            }
        });
    }

    async function performSearch(query) {
        const activeTab = TabNavigation.getActiveTab();
        const container = document.getElementById(`content-${activeTab}`);
        if (!container) return;

        try {
            const articles = await NewsLoader.fetchTabData(activeTab);
            const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

            const results = articles.filter(article => {
                const searchText = [
                    article.title,
                    article.summary,
                    article.source,
                    ...(article.tags || [])
                ].join(' ').toLowerCase();

                return terms.every(term => searchText.includes(term));
            });

            // Sort by match quality (title matches rank higher)
            results.sort((a, b) => {
                const aTitle = terms.filter(t => a.title.toLowerCase().includes(t)).length;
                const bTitle = terms.filter(t => b.title.toLowerCase().includes(t)).length;
                if (bTitle !== aTitle) return bTitle - aTitle;
                return b.relevance_score - a.relevance_score;
            });

            NewsRenderer.renderSearchResults(container, results, query);
            isSearchActive = true;
        } catch (err) {
            console.error('Search error:', err);
        }
    }

    function clear() {
        const activeTab = TabNavigation.getActiveTab();
        const container = document.getElementById(`content-${activeTab}`);
        const saved = TabNavigation.getOriginalContent(activeTab);

        if (container && saved) {
            container.innerHTML = saved;
        }

        const input = document.getElementById('searchInput');
        if (input) input.value = '';

        isSearchActive = false;
    }

    function isActive() {
        return isSearchActive;
    }

    return { init, clear, isActive };
})();
