/**
 * The Marketing Kitchen - Main Application
 * Initializes all modules and handles global state.
 */
(async function MarketingKitchenApp() {
    'use strict';

    const loadingEl = document.getElementById('loadingState');

    try {
        // Load metadata
        const metadata = await NewsLoader.fetchMetadata();

        // Update "last served" timestamp
        if (metadata && metadata.last_updated) {
            const lastUpdated = new Date(metadata.last_updated);
            document.getElementById('lastUpdated').textContent =
                `Last served: ${lastUpdated.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
        }

        // Initialize modules
        TabNavigation.init();
        SearchFilter.init();

        // Hide global loading state
        if (loadingEl) loadingEl.style.display = 'none';

    } catch (err) {
        console.error('Failed to initialize The Marketing Kitchen:', err);

        if (loadingEl) {
            loadingEl.innerHTML = `
                <div class="error-state">
                    <h2>Kitchen's Closed</h2>
                    <p>We're having trouble preparing the news. Please try refreshing the page.</p>
                    <button class="retry-btn" onclick="location.reload()">Refresh</button>
                </div>`;
        }
    }


})();
