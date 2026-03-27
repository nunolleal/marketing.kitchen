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

        // Update "last served" timestamp — relative time, refreshed every minute
        if (metadata && metadata.last_updated) {
            const lastUpdatedDate = new Date(metadata.last_updated);
            const el = document.getElementById('lastUpdated');

            function updateTimestamp() {
                const diffMs = Date.now() - lastUpdatedDate.getTime();
                const diffMin = Math.floor(diffMs / 60000);
                let label;
                if (diffMin < 2)        label = 'Updated just now';
                else if (diffMin < 60)  label = `Updated ${diffMin}m ago`;
                else {
                    const h = Math.floor(diffMin / 60);
                    label = h === 1 ? 'Updated 1h ago' : `Updated ${h}h ago`;
                }
                el.textContent = label;
            }

            updateTimestamp();
            setInterval(updateTimestamp, 60000);
        }

        // Initialize modules
        TabNavigation.init();
        SearchFilter.init();

        // Hide global loading state
        if (loadingEl) loadingEl.style.display = 'none';

        // Easter egg: ~20% chance to show on each page load
        const egg = document.getElementById('easterEgg');
        if (egg && Math.random() < 0.6) {
            egg.style.display = 'inline-block';
        }

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
