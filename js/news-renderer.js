/**
 * News Renderer Module
 * Renders article data into culinary-themed "recipe card" HTML.
 */
const NewsRenderer = (() => {
    const ITEMS_PER_PAGE = 12;
    const pageState = {};

    const DAY_HEADERS = {
        0: 'Sunday Brunch Reads',
        1: "Monday's Main Course",
        2: 'Taco Tuesday Tidbits',
        3: 'Midweek Market Bites',
        4: "Thursday's Tasting Menu",
        5: "Friday's Fresh Catch",
        6: 'Saturday Slow Cook'
    };

    function renderTab(container, articles, tabId) {
        if (!articles || articles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">&#127869;</span>
                    <p>The kitchen is quiet right now. No fresh articles for this section.</p>
                </div>`;
            return;
        }

        // Sort by relevance then recency
        articles.sort((a, b) => {
            if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
            return new Date(b.published) - new Date(a.published);
        });

        pageState[tabId] = { articles, shown: 0 };

        const chefsPicks = articles.slice(0, 3);
        const freshArticles = articles.slice(3, 12);
        const remaining = articles.slice(12);

        let html = '';

        // Day-of-week hero for main tab
        if (tabId === 'main') {
            const today = new Date();
            html += `
                <div class="daily-hero">
                    <h2 class="daily-hero-title">${DAY_HEADERS[today.getDay()]}</h2>
                    <p class="daily-hero-date">${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>`;
        }

        // Chef's Picks
        html += `
            <section class="menu-section">
                <div class="section-header">
                    <h2 class="section-title">
                        <span class="section-icon">&#11088;</span>
                        ${tabId === 'main' ? "Chef's Picks" : 'Top Dishes'}
                    </h2>
                    <span class="section-subtitle">The hottest stories right now</span>
                </div>
                <div class="specials-grid">${chefsPicks.map(a => renderFeaturedCard(a)).join('')}</div>
            </section>`;

        // Fresh from the Oven
        if (freshArticles.length > 0) {
            html += `
                <section class="menu-section">
                    <div class="section-header">
                        <h2 class="section-title">
                            <span class="section-icon">&#128293;</span>
                            Fresh from the Oven
                        </h2>
                        <span class="section-subtitle">Just served up</span>
                    </div>
                    <div class="news-grid">${freshArticles.map(a => renderCard(a)).join('')}</div>
                </section>`;
        }

        // The Full Menu
        if (remaining.length > 0) {
            const initial = remaining.slice(0, ITEMS_PER_PAGE);
            html += `
                <section class="menu-section">
                    <div class="section-header">
                        <h2 class="section-title">
                            <span class="section-icon">&#128214;</span>
                            The Full Menu
                        </h2>
                    </div>
                    <div class="news-grid" id="grid-${tabId}">${initial.map(a => renderCard(a)).join('')}</div>
                    ${remaining.length > ITEMS_PER_PAGE ?
                        `<button class="load-more-btn" id="loadmore-${tabId}" onclick="NewsRenderer.loadMore('${tabId}')">Serve More Stories</button>` : ''}
                </section>`;
            pageState[tabId].shown = 12 + ITEMS_PER_PAGE;
        } else {
            pageState[tabId].shown = articles.length;
        }

        container.innerHTML = html;
    }

    // Category-themed gradient palettes for fallback images
    const CATEGORY_GRADIENTS = {
        marketing:  ['#FFE600', '#F26334'],
        martech:    ['#FFE600', '#00A3AE'],
        ai:         ['#C72C8E', '#188CE5'],
        ai_marketing: ['#FFE600', '#C72C8E'],
        adobe:      ['#FF0000', '#FF5733'],
        salesforce: ['#00A1E0', '#032D60'],
        industry_media:     ['#FFE600', '#F26334'],
        industry_tech:      ['#188CE5', '#00A3AE'],
        industry_telecom:   ['#00A3AE', '#2CC84D'],
        industry_retail:    ['#F26334', '#FFE600'],
        industry_consumer:  ['#C72C8E', '#FFE600'],
        industry_industrial:['#2E2E38', '#00A3AE'],
        industry_lifesciences: ['#2CC84D', '#00A3AE'],
        industry_financial: ['#2E2E38', '#FFE600'],
    };

    function getCardImageStyle(article) {
        if (article.image_url) {
            return `background-image: url('${escapeAttr(article.image_url)}')`;
        }
        // Generate a themed gradient based on source_category + title hash for variety
        const cat = article.source_category || 'marketing';
        const colors = CATEGORY_GRADIENTS[cat] || ['#FFE600', '#00A3AE'];
        const hash = simpleHash(article.title || article.id);
        const angle = 120 + (hash % 60); // angle between 120-180deg
        return `background: linear-gradient(${angle}deg, ${colors[0]}88, ${colors[1]}AA)`;
    }

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    function renderFeaturedCard(article) {
        const timeAgo = getTimeAgo(article.published);
        const spice = getSpiceLevel(article.relevance_score);
        const imgStyle = getCardImageStyle(article);

        const imgClass = article.image_url ? 'card-image' : 'card-image card-image--gradient';
        const sourceInitial = !article.image_url ? `<span class="card-image-initial">${escapeHtml((article.source || '?')[0])}</span>` : '';

        return `
        <article class="recipe-card recipe-card--featured" onclick="window.open('${escapeAttr(article.url)}', '_blank', 'noopener')" tabindex="0" role="link" aria-label="${escapeAttr(article.title)}">
            <div class="${imgClass}" style="${imgStyle}">
                ${sourceInitial}
                <span class="card-source-badge">${escapeHtml(article.source)}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(article.title)}</h3>
                <p class="card-summary">${escapeHtml(article.summary)}</p>
                <div class="card-tags">
                    ${(article.tags || []).slice(0, 3).map(t =>
                        `<span class="tag">${escapeHtml(t)}</span>`
                    ).join('')}
                </div>
                <div class="card-meta">
                    <span class="card-time">${timeAgo}</span>
                    <span class="card-spice" title="Trending score: ${article.relevance_score}/100 — based on topic relevance, recency &amp; source authority">${spice}</span>
                </div>
            </div>
        </article>`;
    }

    function renderCard(article) {
        const timeAgo = getTimeAgo(article.published);
        const spice = getSpiceLevel(article.relevance_score);
        const imgStyle = getCardImageStyle(article);

        const imgClass = article.image_url ? 'card-image' : 'card-image card-image--gradient';
        const sourceInitial = !article.image_url ? `<span class="card-image-initial">${escapeHtml((article.source || '?')[0])}</span>` : '';

        return `
        <article class="recipe-card" onclick="window.open('${escapeAttr(article.url)}', '_blank', 'noopener')" tabindex="0" role="link" aria-label="${escapeAttr(article.title)}">
            <div class="${imgClass}" style="${imgStyle}">
                ${sourceInitial}
                <span class="card-source-badge">${escapeHtml(article.source)}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(article.title)}</h3>
                <p class="card-summary">${escapeHtml(truncate(article.summary, 140))}</p>
                <div class="card-tags">
                    ${(article.tags || []).slice(0, 2).map(t =>
                        `<span class="tag">${escapeHtml(t)}</span>`
                    ).join('')}
                </div>
                <div class="card-meta">
                    <span class="card-time">${timeAgo}</span>
                    <span class="card-spice" title="Trending score: ${article.relevance_score}/100 — based on topic relevance, recency &amp; source authority">${spice}</span>
                </div>
            </div>
        </article>`;
    }

    function renderSearchResults(container, articles, query) {
        if (articles.length === 0) {
            container.innerHTML = `
                <div class="search-results-header">
                    <h2>No results for "<span>${escapeHtml(query)}</span>"</h2>
                    <button class="clear-search-btn" onclick="SearchFilter.clear()">Clear search</button>
                </div>
                <div class="empty-state">
                    <span class="empty-icon">&#128270;</span>
                    <p>We couldn't find any dishes matching your search. Try different ingredients!</p>
                </div>`;
            return;
        }

        let html = `
            <div class="search-results-header">
                <h2>${articles.length} result${articles.length !== 1 ? 's' : ''} for "<span>${escapeHtml(query)}</span>"</h2>
                <button class="clear-search-btn" onclick="SearchFilter.clear()">Clear search</button>
            </div>
            <div class="news-grid">${articles.map(a => renderCard(a)).join('')}</div>`;

        container.innerHTML = html;
    }

    function loadMore(tabId) {
        const state = pageState[tabId];
        if (!state) return;
        const grid = document.getElementById(`grid-${tabId}`);
        if (!grid) return;

        const nextBatch = state.articles.slice(state.shown, state.shown + ITEMS_PER_PAGE);
        grid.insertAdjacentHTML('beforeend', nextBatch.map(a => renderCard(a)).join(''));
        state.shown += ITEMS_PER_PAGE;

        if (state.shown >= state.articles.length) {
            const btn = document.getElementById(`loadmore-${tabId}`);
            if (btn) btn.style.display = 'none';
        }
    }

    function getTimeAgo(isoString) {
        if (!isoString) return '';
        const diff = Date.now() - new Date(isoString).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 5) return 'Just served';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    }

    /**
     * Rocket rating based on article signals:
     *   5 rockets: score 80+  (top relevance + very recent + high-weight keywords)
     *   4 rockets: score 60-79 (strong relevance or trending topic)
     *   3 rockets: score 40-59 (solid industry coverage)
     *   2 rockets: score 20-39 (general interest)
     *   1 rocket:  score <20   (low relevance / older article)
     */
    function getSpiceLevel(score) {
        if (score == null) return '';
        const level = Math.min(5, Math.max(1, Math.ceil(score / 20)));
        return '\u{1F680}'.repeat(level);
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function truncate(str, len) {
        if (!str || str.length <= len) return str || '';
        return str.substring(0, len).trim() + '...';
    }

    return { renderTab, renderSearchResults, loadMore };
})();
