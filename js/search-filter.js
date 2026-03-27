/**
 * Search & Filter Module
 * Global client-side search across all tabs. Press / to focus.
 */
const SearchFilter = (() => {
    let debounceTimer = null;
    let isSearchActive = false;

    const TAB_LABELS = {
        main:         "Today's Menu",
        media:        'Media',
        tech:         'Tech',
        telecom:      'Telecom',
        retail:       'Retail',
        consumer:     'Consumer',
        industrial:   'Industrial',
        lifesciences: 'Life Sci',
        financial:    'Financial',
        adobe:        'Adobe',
        salesforce:   'Salesforce',
    };

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
                if (query.length >= 2) performSearch(query);
            }
        });

        // Press / anywhere to focus search (unless already in an input)
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                input.focus();
                input.select();
            }
        });
    }

    async function performSearch(query) {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

        // Fetch all tabs in parallel (cached after first load)
        const allTabIds = NewsLoader.getAllTabIds();
        const fetches = allTabIds.map(tabId =>
            NewsLoader.fetchTabData(tabId)
                .then(articles => articles.map(a => ({ ...a, _tab: tabId })))
                .catch(() => [])
        );
        const allArrays = await Promise.all(fetches);
        const allArticles = allArrays.flat();

        // Deduplicate by article id across tabs
        const seen = new Set();
        const unique = [];
        for (const a of allArticles) {
            if (!seen.has(a.id)) {
                seen.add(a.id);
                unique.push(a);
            }
        }

        // Filter by search terms
        const results = unique.filter(article => {
            const searchText = [
                article.title,
                article.summary,
                article.source,
                ...(article.tags || [])
            ].join(' ').toLowerCase();
            return terms.every(term => searchText.includes(term));
        });

        // Sort: title matches first, then by relevance score
        results.sort((a, b) => {
            const aTitle = terms.filter(t => a.title.toLowerCase().includes(t)).length;
            const bTitle = terms.filter(t => b.title.toLowerCase().includes(t)).length;
            if (bTitle !== aTitle) return bTitle - aTitle;
            return b.relevance_score - a.relevance_score;
        });

        // Show results in the active tab panel
        const activeTab = TabNavigation.getActiveTab();
        const container = document.getElementById(`content-${activeTab}`);
        if (container) {
            renderGlobalSearchResults(container, results, query);
        }
        isSearchActive = true;
    }

    function renderGlobalSearchResults(container, results, query) {
        const escHtml = str => {
            if (!str) return '';
            const d = document.createElement('div');
            d.textContent = str;
            return d.innerHTML;
        };

        if (results.length === 0) {
            container.innerHTML = `
                <div class="search-results-header">
                    <h2>No results for "<span>${escHtml(query)}</span>"</h2>
                    <button class="clear-search-btn" onclick="SearchFilter.clear()">Clear</button>
                </div>
                <div class="empty-state">
                    <span class="empty-icon">&#128270;</span>
                    <p>No dishes found matching your search. Try different ingredients!</p>
                </div>`;
            return;
        }

        const cards = results.map(a => {
            const tabLabel = TAB_LABELS[a._tab] || a._tab;
            return `
            <article class="recipe-card" onclick="window.open('${escHtml(a.url)}', '_blank', 'noopener')" tabindex="0" role="link">
                <div class="card-image" style="${getImageStyle(a)}">
                    <span class="card-source-badge">${escHtml(a.source)}</span>
                    <span class="search-tab-badge">${escHtml(tabLabel)}</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${escHtml(a.title)}</h3>
                    <p class="card-summary">${escHtml((a.summary || '').substring(0, 140))}${(a.summary || '').length > 140 ? '...' : ''}</p>
                    <div class="card-meta">
                        <span class="card-time">${getTimeAgo(a.published)}</span>
                    </div>
                </div>
            </article>`;
        }).join('');

        container.innerHTML = `
            <div class="search-results-header">
                <h2>${results.length} result${results.length !== 1 ? 's' : ''} for "<span>${escHtml(query)}</span>" <small>across all sections</small></h2>
                <button class="clear-search-btn" onclick="SearchFilter.clear()">Clear</button>
            </div>
            <div class="news-grid">${cards}</div>`;
    }

    function getImageStyle(article) {
        if (article.image_url) return `background-image: url('${article.image_url}')`;
        // Simple fallback gradient
        const palettes = {
            marketing: ['#667eea','#764ba2'], martech: ['#6a11cb','#2575fc'],
            ai: ['#0250c5','#d43f8d'], ai_marketing: ['#4facfe','#00f2fe'],
            adobe: ['#ed213a','#93291e'], salesforce: ['#00b4db','#0083b0'],
        };
        const pair = palettes[article.source_category] || ['#667eea','#764ba2'];
        return `background: linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
    }

    function getTimeAgo(isoString) {
        if (!isoString) return '';
        const diff = Date.now() - new Date(isoString).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }

    function clear() {
        const activeTab = TabNavigation.getActiveTab();
        const container = document.getElementById(`content-${activeTab}`);
        const saved = TabNavigation.getOriginalContent(activeTab);
        if (container && saved) container.innerHTML = saved;
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
        isSearchActive = false;
    }

    function isActive() { return isSearchActive; }

    return { init, clear, isActive };
})();
