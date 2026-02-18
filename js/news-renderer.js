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
        resetFallbackTracker();
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

    // Curated fallback photos per category (Unsplash CDN, no API key needed)
    const FALLBACK_IMAGES = {
        marketing: [
            'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop',
        ],
        martech: [
            'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop',
        ],
        ai: [
            'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1531746790095-e5995ae3c985?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&h=400&fit=crop',
        ],
        ai_marketing: [
            'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1531746790095-e5995ae3c985?w=800&h=400&fit=crop',
        ],
        adobe: [
            'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&h=400&fit=crop',
        ],
        salesforce: [
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop',
        ],
        industry_media: [
            'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=800&h=400&fit=crop',
        ],
        industry_tech: [
            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=400&fit=crop',
        ],
        industry_telecom: [
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1562408590-e32931084e23?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1516044734145-07ca8eef8731?w=800&h=400&fit=crop',
        ],
        industry_retail: [
            'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&h=400&fit=crop',
        ],
        industry_consumer: [
            'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=800&h=400&fit=crop',
        ],
        industry_industrial: [
            'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=800&h=400&fit=crop',
        ],
        industry_lifesciences: [
            'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1576671081837-49000212a370?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800&h=400&fit=crop',
        ],
        industry_financial: [
            'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=400&fit=crop',
        ],
    };

    // Track fallback image usage per render to avoid repeats
    const fallbackTracker = {};

    function resetFallbackTracker() {
        for (const key in fallbackTracker) {
            delete fallbackTracker[key];
        }
    }

    function getCardImageStyle(article) {
        if (article.image_url) {
            return `background-image: url('${escapeAttr(article.image_url)}')`;
        }
        // Pick a curated category-relevant photo, cycling sequentially to avoid repeats
        const cat = article.source_category || 'marketing';
        const pool = FALLBACK_IMAGES[cat] || FALLBACK_IMAGES.marketing;
        if (!(cat in fallbackTracker)) {
            fallbackTracker[cat] = 0;
        }
        const img = pool[fallbackTracker[cat] % pool.length];
        fallbackTracker[cat]++;
        return `background-image: url('${img}')`;
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

        const imgClass = 'card-image';
        const sourceInitial = '';

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

        const imgClass = 'card-image';
        const sourceInitial = '';

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
        resetFallbackTracker();
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
