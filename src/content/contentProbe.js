/* contentProbe.js
 * Collect HTML5 storage metrics, watch for hijack indicators, inject canvas hooks.
 */
(function () {
    function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
    async function collect() {
        const localKeys = safe(() => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)), []);
        const sessionKeys = safe(() => Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i)), []);
        let idbDbs = [];
        if (window.indexedDB && indexedDB.databases) {
            try { const dbs = await indexedDB.databases(); idbDbs = (dbs || []).map(d => d.name).filter(Boolean); } catch (e) { }
        }
        let cacheKeys = [];
        if (window.caches) {
            try { cacheKeys = await caches.keys(); } catch (e) { }
        }
        const data = {
            localStorageKeys: localKeys,
            sessionStorageKeys: sessionKeys,
            indexedDBDatabases: idbDbs,
            cacheBuckets: cacheKeys
        };
        browser.runtime.sendMessage({ type: 'CONTENT_PROBE_SUMMARY', data }).catch(() => { });
    }

    // Hijack indicators
    const hijack = { hookScripts: [], beforeUnload: false, popupFlood: false };
    const openOrig = window.open;
    let openCount = 0;
    window.open = function () { openCount++; if (openCount > 5) hijack.popupFlood = true; return openOrig.apply(this, arguments); };
    window.addEventListener('beforeunload', () => { hijack.beforeUnload = true; scheduleHijackReport(); });
    const observer = new MutationObserver(muts => {
        for (const m of muts) {
            for (const n of m.addedNodes) {
                if (n.tagName === 'SCRIPT' && n.src) {
                    if (/\/hook\.js$/i.test(n.src)) {
                        hijack.hookScripts.push(n.src);
                        scheduleHijackReport();
                    }
                }
            }
        }
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    let hijackTimer;
    function scheduleHijackReport() {
        clearTimeout(hijackTimer);
        hijackTimer = setTimeout(() => {
            browser.runtime.sendMessage({ type: 'HIJACK_ALERT', data: { ...hijack, suspect: hijack.hookScripts.length || hijack.beforeUnload || hijack.popupFlood } }).catch(() => { });
        }, 1000);
    }

    // Inject canvas hook
    const s = document.createElement('script');
    s.textContent = `(${function () {/* injected */ }.toString()});`;
    // Instead of inline function body we append file content via fetch? Simpler: include separate script tag referencing extension file:
    const canvasScript = document.createElement('script');
    canvasScript.src = browser.runtime.getURL('src/content/canvasHook.js');
    (document.head || document.documentElement).appendChild(canvasScript);
    canvasScript.onload = () => canvasScript.remove();

    // initial collection after DOM
    if (document.readyState === 'complete' || document.readyState === 'interactive') collect();
    else document.addEventListener('DOMContentLoaded', collect);
})();
