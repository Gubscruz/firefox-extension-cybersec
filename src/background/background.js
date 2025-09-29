/* background.js
 * Core request interception, site state tracking, cookie analysis, cookie sync detection, messaging bootstrap.
 */
// Using global functions loaded earlier (classic MV2 non-module environment)

// Maintain tabId -> topSiteETLD1 mapping
const tabTopSite = new Map();

// Track cookies per site (cached minimal) for cookie sync comparisons
const siteCookiesCache = new Map();

async function refreshSiteCookies(etld1) {
    // gather all cookies for domain's host; limited risk
    const cookies = await browser.cookies.getAll({ domain: etld1 });
    siteCookiesCache.set(etld1, cookies);
    const summary = await getSiteSummary(etld1) || {};
    summary.cookies = cookies.map(c => ({
        name: c.name,
        domain: c.domain,
        session: c.session,
        expirationDate: c.expirationDate,
        thirdParty: getETLD1(c.domain.replace(/^\./, '')) !== etld1
    }));
    await setSiteSummary(etld1, summary);
}

browser.webNavigation.onCommitted.addListener(details => {
    if (details.frameId === 0) {
        const host = getHost(details.url);
        const etld1 = getETLD1(host);
        tabTopSite.set(details.tabId, etld1);
        refreshSiteCookies(etld1).catch(() => { });
    }
});

browser.tabs.onRemoved.addListener(tabId => {
    tabTopSite.delete(tabId);
});

browser.webRequest.onBeforeRequest.addListener(
    async (details) => {
        const topSite = tabTopSite.get(details.tabId);
        if (!topSite) return;
        const event = classifyRequest(details, topSite);
        const block = event.thirdParty && await shouldBlock(event.requestHost, topSite);
        event.tracker = event.thirdParty && isTracker(event.requestHost);
        if (block) {
            event.blocked = true;
        }
        await pushEvent(details.tabId, event);
        // cookie sync detection (only for third-party requests)
        if (event.thirdParty) {
            try {
                const cookies = siteCookiesCache.get(topSite) || [];
                const syncMatches = await detectCookieSync(cookies, event, event.requestHost);
                if (syncMatches.length) {
                    const summary = await getSiteSummary(topSite) || {};
                    if (!summary.cookieSync) summary.cookieSync = [];
                    summary.cookieSync.push(...syncMatches);
                    await setSiteSummary(topSite, summary);
                }
            } catch (e) {/* noop */ }
        }
        if (block) return { cancel: true };
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
);

// examine outgoing headers for additional sync signals (simplified)
browser.webRequest.onBeforeSendHeaders.addListener(async details => {
    // Could parse referer/query again if needed
}, { urls: ["<all_urls>"] }, ["requestHeaders"]);

self.initMessaging();

console.log('[Privacy Shield] background initialized');
