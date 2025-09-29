/* storage.js
 * Centralized storage helpers over browser.storage.local with simple namespacing and pruning.
 */
const MAX_EVENTS_PER_TAB = 400; // prevent uncontrolled growth

async function _get(key) {
    const r = await browser.storage.local.get(key);
    return r[key];
}
async function _set(obj) {
    await browser.storage.local.set(obj);
}

self.pushEvent = async function pushEvent(tabId, event) {
    const key = `events:${tabId}`;
    const arr = await _get(key) || [];
    arr.push(event);
    if (arr.length > MAX_EVENTS_PER_TAB) arr.splice(0, arr.length - MAX_EVENTS_PER_TAB);
    await _set({ [key]: arr });
}

self.getEvents = async function getEvents(tabId) {
    return await _get(`events:${tabId}`) || [];
}

self.setSiteSummary = async function setSiteSummary(etld1, summary) {
    await _set({ [`siteSummaries:${etld1}`]: summary });
}
self.getSiteSummary = async function getSiteSummary(etld1) {
    return await _get(`siteSummaries:${etld1}`) || {};
}

self.getAllSiteSummaries = async function getAllSiteSummaries() {
    const all = await browser.storage.local.get(null);
    const res = {};
    for (const k of Object.keys(all)) {
        if (k.startsWith('siteSummaries:')) {
            res[k.split(':')[1]] = all[k];
        }
    }
    return res;
}

self.loadRules = async function loadRules() {
    const data = await _get('rules:user');
    if (!data) return {
        enabled: true,
        deepCookieSyncCheck: false,
        allow: [],
        block: [],
        regex: []
    };
    return data;
}
self.saveRules = async function saveRules(rules) {
    await _set({ 'rules:user': rules });
}

self.recordAlert = async function recordAlert(etld1, type, payload) {
    const summary = await getSiteSummary(etld1);
    if (!summary.alerts) summary.alerts = [];
    summary.alerts.push({ type, payload, time: Date.now() });
    await setSiteSummary(etld1, summary);
}

self.updateSiteStorage = async function updateSiteStorage(etld1, storageData) {
    const summary = await getSiteSummary(etld1);
    summary.html5 = storageData;
    await setSiteSummary(etld1, summary);
}

self.updateCanvas = async function updateCanvas(etld1, canvasData) {
    const summary = await getSiteSummary(etld1);
    summary.canvas = canvasData;
    await setSiteSummary(etld1, summary);
}

self.updateHijack = async function updateHijack(etld1, hijackData) {
    const summary = await getSiteSummary(etld1);
    summary.hijack = hijackData;
    await setSiteSummary(etld1, summary);
}

self.updateCookieSync = async function updateCookieSync(etld1, syncEvents) {
    const summary = await getSiteSummary(etld1);
    if (!summary.cookieSync) summary.cookieSync = [];
    summary.cookieSync.push(...syncEvents);
    await setSiteSummary(etld1, summary);
}

// Functions attached to self
