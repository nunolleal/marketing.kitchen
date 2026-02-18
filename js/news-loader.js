/**
 * News Loader Module
 * Fetches JSON data files with in-memory caching.
 */
const NewsLoader = (() => {
    const cache = {};
    const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

    const TAB_DATA_MAP = {
        'main':         'data/main-feed.json',
        'media':        'data/industry-media.json',
        'tech':         'data/industry-tech.json',
        'telecom':      'data/industry-telecom.json',
        'retail':       'data/industry-retail.json',
        'consumer':     'data/industry-consumer.json',
        'industrial':   'data/industry-industrial.json',
        'lifesciences': 'data/industry-lifesciences.json',
        'financial':    'data/industry-financial.json',
        'adobe':        'data/vendor-adobe.json',
        'salesforce':   'data/vendor-salesforce.json'
    };

    async function fetchData(jsonPath) {
        if (cache[jsonPath] && (Date.now() - cache[jsonPath].timestamp < CACHE_TTL_MS)) {
            return cache[jsonPath].data;
        }

        const cacheBuster = Math.floor(Date.now() / (60 * 60 * 1000));
        const response = await fetch(`${jsonPath}?v=${cacheBuster}`);

        if (!response.ok) {
            throw new Error(`Failed to load ${jsonPath}: ${response.status}`);
        }

        const data = await response.json();
        cache[jsonPath] = { data, timestamp: Date.now() };
        return data;
    }

    async function fetchTabData(tabId) {
        const path = TAB_DATA_MAP[tabId];
        if (!path) throw new Error(`Unknown tab: ${tabId}`);
        return fetchData(path);
    }

    async function fetchMetadata() {
        return fetchData('data/metadata.json');
    }

    function getTabDataPath(tabId) {
        return TAB_DATA_MAP[tabId] || null;
    }

    function getAllTabIds() {
        return Object.keys(TAB_DATA_MAP);
    }

    function clearCache() {
        Object.keys(cache).forEach(k => delete cache[k]);
    }

    return { fetchData, fetchTabData, fetchMetadata, getTabDataPath, getAllTabIds, clearCache };
})();
