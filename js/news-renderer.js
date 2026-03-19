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

    // Large pool of diverse, high-quality Unsplash images organized by topic.
    // Specific topics checked FIRST; broad catch-alls (like "ai") checked LAST.
    // 10-15 images per group to maximize variety.
    const KEYWORD_IMAGES = [
        // --- Specific topics first ---
        { keys: ['adobe', 'photoshop', 'creative cloud', 'firefly', 'experience cloud', 'illustrator', 'premiere'], imgs: [
            'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1613909207039-6b173b755cc1?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1561998338-13ad7883b20f?w=800&h=400&fit=crop',
        ]},
        { keys: ['salesforce', 'einstein', 'agentforce', 'data cloud'], imgs: [
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&h=400&fit=crop',
        ]},
        { keys: ['social media', 'instagram', 'tiktok', 'facebook', 'youtube', 'influencer', 'creator economy'], imgs: [
            'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1496449903678-68ddcb189a24?w=800&h=400&fit=crop',
        ]},
        { keys: ['ecommerce', 'e-commerce', 'shopping', 'amazon', 'walmart', 'shopify'], imgs: [
            'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1553729459-afe8f2e2ed65?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=800&h=400&fit=crop',
        ]},
        { keys: ['streaming', 'netflix', 'disney', 'entertainment', 'content studio', 'hulu', 'paramount'], imgs: [
            'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1574375927938-d5a98e8d7e28?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?w=800&h=400&fit=crop',
        ]},
        { keys: ['healthcare', 'pharma', 'medical', 'patient', 'drug', 'biotech', 'life science', 'clinical'], imgs: [
            'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1576671081837-49000212a370?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop',
        ]},
        { keys: ['finance', 'banking', 'fintech', 'payment', 'credit', 'investment', 'insurance', 'wealth'], imgs: [
            'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1518458028785-8b5e1b4bf3b4?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=400&fit=crop',
        ]},
        { keys: ['manufacturing', 'industrial', 'factory', 'supply chain', 'logistics'], imgs: [
            'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1563694983011-6f4d90358083?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&h=400&fit=crop',
        ]},
        { keys: ['telecom', '5g', 'wireless', 'carrier', 'verizon', 't-mobile', 'broadband'], imgs: [
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1562408590-e32931084e23?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1516044734145-07ca8eef8731?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1534224039826-c7a0eda0e6b3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1520869562399-e772f042f422?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1548092372-0d1bd40894a3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1606765962248-7ff407b51667?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop',
        ]},
        { keys: ['privacy', 'security', 'compliance', 'gdpr', 'cookie', 'consent', 'regulation'], imgs: [
            'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop',
        ]},
        { keys: ['email', 'newsletter', 'inbox', 'automation', 'workflow'], imgs: [
            'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop',
        ]},
        { keys: ['mobile', 'app', 'smartphone', 'ios', 'android'], imgs: [
            'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1601972599720-36938d4ecd31?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1580910051074-3eb694886f5b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1596558450268-9c27524ba856?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=400&fit=crop',
        ]},
        // --- Broader marketing/business topics ---
        { keys: ['data', 'analytics', 'dashboard', 'metrics', 'measurement', 'attribution', 'insight'], imgs: [
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop',
        ]},
        { keys: ['brand', 'branding', 'creative', 'design', 'campaign', 'content'], imgs: [
            'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1496559249665-c7e2874707ea?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800&h=400&fit=crop',
        ]},
        { keys: ['customer', 'experience', 'cx', 'loyalty', 'personalization', 'engagement', 'retention'], imgs: [
            'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1552581234-26160f608093?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&h=400&fit=crop',
        ]},
        { keys: ['cloud', 'saas', 'platform', 'software', 'api', 'infrastructure', 'developer'], imgs: [
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1563986768609-322da13575f2?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=400&fit=crop',
        ]},
        { keys: ['cmo', 'ceo', 'leadership', 'executive', 'chief', 'officer'], imgs: [
            'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&h=400&fit=crop',
        ]},
        { keys: ['retail', 'store', 'omnichannel', 'target'], imgs: [
            'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1553729459-afe8f2e2ed65?w=800&h=400&fit=crop',
        ]},
        // --- Broadest catch-alls LAST (so specific topics match first) ---
        { keys: ['strategy', 'transformation', 'digital', 'innovation', 'growth'], imgs: [
            'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=800&h=400&fit=crop',
        ]},
        { keys: ['marketing', 'martech', 'advertising', 'media', 'video', 'search', 'seo', 'google'], imgs: [
            'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1496449903678-68ddcb189a24?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&h=400&fit=crop',
        ]},
        { keys: ['ai', 'artificial intelligence', 'machine learning', 'generative', 'gpt', 'llm', 'chatbot', 'copilot', 'agent'], imgs: [
            // Business/abstract AI — no robots
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop',
        ]},
    ];

    // Large generic fallback pool (last resort — diverse business/tech imagery)
    const GENERIC_FALLBACKS = [
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1496449903678-68ddcb189a24?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=400&fit=crop',
    ];

    function resetFallbackTracker() { /* no-op, using hash-based selection now */ }

    function getCardImageStyle(article) {
        if (article.image_url) {
            return `background-image: url('${escapeAttr(article.image_url)}')`;
        }

        // Match article title+summary keywords to find the most relevant image pool
        const titleLower = ((article.title || '') + ' ' + (article.summary || '')).toLowerCase();
        const hash = simpleHash(article.id || article.title || '');

        for (const group of KEYWORD_IMAGES) {
            for (const key of group.keys) {
                if (titleLower.includes(key)) {
                    const img = group.imgs[hash % group.imgs.length];
                    return `background-image: url('${img}')`;
                }
            }
        }

        // Generic fallback
        const img = GENERIC_FALLBACKS[hash % GENERIC_FALLBACKS.length];
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
