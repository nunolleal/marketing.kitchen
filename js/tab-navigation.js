/**
 * Tab Navigation Module
 * Handles tab switching with URL hash support and lazy loading.
 */
const TabNavigation = (() => {
    const loadedTabs = new Set();
    let activeTab = 'main';
    let originalContent = {}; // stores rendered HTML per tab for search restore

    function init() {
        document.querySelectorAll('.menu-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Check URL hash
        const hash = window.location.hash.replace('#', '');
        const validTabs = NewsLoader.getAllTabIds();
        if (hash && validTabs.includes(hash)) {
            switchTab(hash);
        } else {
            switchTab('main');
        }

        // Browser back/forward
        window.addEventListener('hashchange', () => {
            const h = window.location.hash.replace('#', '');
            if (h && NewsLoader.getAllTabIds().includes(h) && h !== activeTab) {
                switchTab(h);
            }
        });

        // Keyboard navigation for tabs
        document.querySelector('.nav-scroll-container').addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const tabs = Array.from(document.querySelectorAll('.menu-tab'));
                const currentIdx = tabs.findIndex(t => t.dataset.tab === activeTab);
                let nextIdx;
                if (e.key === 'ArrowRight') {
                    nextIdx = (currentIdx + 1) % tabs.length;
                } else {
                    nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
                }
                tabs[nextIdx].focus();
                switchTab(tabs[nextIdx].dataset.tab);
                e.preventDefault();
            }
        });
    }

    async function switchTab(tabId) {
        if (!NewsLoader.getTabDataPath(tabId)) return;

        // Update tab UI
        document.querySelectorAll('.menu-tab').forEach(t => {
            const isActive = t.dataset.tab === tabId;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive);
        });

        // Show/hide panels
        document.querySelectorAll('.tab-content').forEach(panel => {
            panel.classList.toggle('active', panel.id === `content-${tabId}`);
        });

        // Update URL hash
        history.replaceState(null, '', `#${tabId}`);
        activeTab = tabId;

        // Lazy load
        if (!loadedTabs.has(tabId)) {
            await loadTabData(tabId);
            loadedTabs.add(tabId);
        }
    }

    async function loadTabData(tabId) {
        const container = document.getElementById(`content-${tabId}`);
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-animation">
                    <div class="pot">
                        <div class="pot-body"></div>
                        <div class="steam steam-1"></div>
                        <div class="steam steam-2"></div>
                        <div class="steam steam-3"></div>
                    </div>
                    <p class="loading-text">Warming up this dish...</p>
                </div>
            </div>`;

        try {
            const articles = await NewsLoader.fetchTabData(tabId);
            NewsRenderer.renderTab(container, articles, tabId);
            originalContent[tabId] = container.innerHTML;
        } catch (err) {
            console.error(`Failed to load tab ${tabId}:`, err);
            container.innerHTML = `
                <div class="error-state">
                    <h2>Kitchen's Closed</h2>
                    <p>We're having trouble loading this section.</p>
                    <button class="retry-btn" onclick="TabNavigation.retryTab('${tabId}')">Try Again</button>
                </div>`;
        }
    }

    function retryTab(tabId) {
        loadedTabs.delete(tabId);
        loadTabData(tabId).then(() => loadedTabs.add(tabId));
    }

    function getActiveTab() {
        return activeTab;
    }

    function getOriginalContent(tabId) {
        return originalContent[tabId] || null;
    }

    function reloadActiveTab() {
        loadedTabs.delete(activeTab);
        loadTabData(activeTab).then(() => loadedTabs.add(activeTab));
    }

    return { init, switchTab, retryTab, getActiveTab, getOriginalContent, reloadActiveTab };
})();
