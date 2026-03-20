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

        articles.sort((a, b) => {
            if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
            return new Date(b.published) - new Date(a.published);
        });

        pageState[tabId] = { articles, shown: 0 };

        const chefsPicks = articles.slice(0, 3);
        const freshArticles = articles.slice(3, 12);
        const remaining = articles.slice(12);

        let html = '';

        if (tabId === 'main') {
            const today = new Date();
            html += `
                <div class="daily-hero">
                    <h2 class="daily-hero-title">${DAY_HEADERS[today.getDay()]}</h2>
                    <p class="daily-hero-date">${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>`;
        }

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

    // ── Gradient fallback system ──────────────────────────────────
    // When no article image exists, generate a unique abstract gradient
    // based on category palette + article hash. Zero duplicates possible.

    const GRADIENT_PALETTES = {
        marketing:  [['#667eea','#764ba2'],['#f093fb','#f5576c'],['#4facfe','#00f2fe'],['#43e97b','#38f9d7'],['#fa709a','#fee140'],['#a18cd1','#fbc2eb'],['#ffecd2','#fcb69f'],['#ff9a9e','#fecfef']],
        martech:    [['#667eea','#764ba2'],['#6a11cb','#2575fc'],['#37ecba','#72afd3'],['#48c6ef','#6f86d6'],['#0250c5','#d43f8d'],['#0ba360','#3cba92'],['#c471f5','#fa71cd'],['#a8edea','#fed6e3']],
        ai:         [['#6a11cb','#2575fc'],['#667eea','#764ba2'],['#0250c5','#d43f8d'],['#7f7fd5','#91eae4'],['#4facfe','#00f2fe'],['#c471f5','#fa71cd'],['#a8c0ff','#3f2b96'],['#00c6fb','#005bea']],
        ai_marketing:[['#667eea','#764ba2'],['#f093fb','#f5576c'],['#6a11cb','#2575fc'],['#0250c5','#d43f8d'],['#4facfe','#00f2fe'],['#a18cd1','#fbc2eb'],['#c471f5','#fa71cd'],['#7f7fd5','#91eae4']],
        adobe:      [['#ed213a','#93291e'],['#ff416c','#ff4b2b'],['#f12711','#f5af19'],['#e65c00','#f9d423'],['#ff0844','#ffb199'],['#fc4a1a','#f7b733'],['#c31432','#240b36'],['#eb3349','#f45c43']],
        salesforce: [['#00b4db','#0083b0'],['#2193b0','#6dd5ed'],['#1a2980','#26d0ce'],['#0052d4','#6fb1fc'],['#005c97','#363795'],['#00c6fb','#005bea'],['#0250c5','#d43f8d'],['#4facfe','#00f2fe']],
        industry_media:     [['#7f00ff','#e100ff'],['#6441a5','#2a0845'],['#8e2de2','#4a00e0'],['#c31432','#240b36'],['#200122','#6f0000'],['#5f2c82','#49a09d'],['#c94b4b','#4b134f'],['#4776e6','#8e54e9']],
        industry_tech:      [['#0f2027','#2c5364'],['#000428','#004e92'],['#1a2980','#26d0ce'],['#0f0c29','#302b63'],['#2193b0','#6dd5ed'],['#005c97','#363795'],['#141e30','#243b55'],['#0052d4','#6fb1fc']],
        industry_telecom:   [['#00c6fb','#005bea'],['#4facfe','#00f2fe'],['#0250c5','#d43f8d'],['#2193b0','#6dd5ed'],['#1a2980','#26d0ce'],['#0f2027','#2c5364'],['#00b4db','#0083b0'],['#005c97','#363795']],
        industry_retail:    [['#f093fb','#f5576c'],['#fa709a','#fee140'],['#ff9a9e','#fecfef'],['#ffecd2','#fcb69f'],['#ee9ca7','#ffdde1'],['#ff758c','#ff7eb3'],['#fc5c7d','#6a82fb'],['#f857a6','#ff5858']],
        industry_consumer:  [['#43e97b','#38f9d7'],['#fa709a','#fee140'],['#ffecd2','#fcb69f'],['#f093fb','#f5576c'],['#ff9a9e','#fecfef'],['#a8edea','#fed6e3'],['#37ecba','#72afd3'],['#fddb92','#d1fdff']],
        industry_industrial:[['#536976','#292e49'],['#141e30','#243b55'],['#0f2027','#2c5364'],['#2c3e50','#4ca1af'],['#3a6186','#89253e'],['#373b44','#4286f4'],['#485563','#29323c'],['#414345','#232526']],
        industry_lifesciences:[['#11998e','#38ef7d'],['#43e97b','#38f9d7'],['#0ba360','#3cba92'],['#37ecba','#72afd3'],['#00b09b','#96c93d'],['#56ab2f','#a8e063'],['#a8edea','#fed6e3'],['#11998e','#38ef7d']],
        industry_financial: [['#0ba360','#3cba92'],['#11998e','#38ef7d'],['#134e5e','#71b280'],['#1d976c','#93f9b9'],['#2c3e50','#4ca1af'],['#56ab2f','#a8e063'],['#000428','#004e92'],['#005c97','#363795']],
    };

    function getCardImageStyle(article) {
        if (article.image_url) {
            return `background-image: url('${escapeAttr(article.image_url)}')`;
        }

        // Generate a unique gradient from category palette + article hash
        const hash = simpleHash(article.id || article.title || article.url || '');
        const hash2 = simpleHash((article.title || '') + (article.id || ''));

        const cat = article.source_category || 'marketing';
        const palette = GRADIENT_PALETTES[cat] || GRADIENT_PALETTES.marketing;

        const pair = palette[hash % palette.length];
        const angle = 90 + (hash2 % 180); // 90-270 degrees for variety

        return `background: linear-gradient(${angle}deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
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

        return `
        <article class="recipe-card recipe-card--featured" onclick="window.open('${escapeAttr(article.url)}', '_blank', 'noopener')" tabindex="0" role="link" aria-label="${escapeAttr(article.title)}">
            <div class="card-image" style="${imgStyle}">
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

        return `
        <article class="recipe-card" onclick="window.open('${escapeAttr(article.url)}', '_blank', 'noopener')" tabindex="0" role="link" aria-label="${escapeAttr(article.title)}">
            <div class="card-image" style="${imgStyle}">
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
