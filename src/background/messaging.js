/* messaging.js
 * Central message routing.
 */
// Uses global functions from other background scripts.

self.handleMessage = async function handleMessage(msg, sender) {
    switch (msg.type) {
        case 'CONTENT_PROBE_SUMMARY': {
            const etld1 = msg.topETLD1 || getETLD1(sender.url ? new URL(sender.url).hostname : '');
            await updateSiteStorage(etld1, msg.data);
            return { ok: true };
        }
        case 'CANVAS_ALERT': {
            const etld1 = msg.topETLD1 || getETLD1(sender.url ? new URL(sender.url).hostname : '');
            await updateCanvas(etld1, msg.data);
            return { ok: true };
        }
        case 'HIJACK_ALERT': {
            const etld1 = msg.topETLD1 || getETLD1(sender.url ? new URL(sender.url).hostname : '');
            await updateHijack(etld1, msg.data);
            return { ok: true };
        }
        case 'COOKIE_SYNC_EVENTS': {
            const etld1 = msg.topETLD1;
            await updateCookieSync(etld1, msg.events);
            return { ok: true };
        }
        case 'SCORE_REQUEST': {
            const etld1 = msg.topETLD1;
            const summary = await getSiteSummary(etld1);
            const events = await getEvents(msg.tabId);
            const uniqueThird = new Set();
            const trackerDomains = new Set();
            let thirdPartyCookies = 0, firstPartyPersistentCookies = 0;
            if (summary.cookies) {
                for (const c of summary.cookies) {
                    if (c.thirdParty) thirdPartyCookies++; else if (!c.session) firstPartyPersistentCookies++;
                }
            }
            for (const ev of events) {
                if (ev.thirdParty) uniqueThird.add(ev.requestETLD1);
                if (ev.tracker) trackerDomains.add(ev.requestETLD1);
            }
            const score = computeScore({
                uniqueThirdPartyDomains: uniqueThird,
                trackerDomains,
                thirdPartyCookies,
                firstPartyPersistentCookies,
                canvasSuspect: summary.canvas?.suspect,
                cookieSyncCount: (summary.cookieSync || []).length,
                hijackSuspect: summary.hijack?.suspect
            });
            return { type: 'SCORE_RESPONSE', score, summary };
        }
    }
};

self.initMessaging = function initMessaging() {
    browser.runtime.onMessage.addListener((msg, sender) => {
        return Promise.resolve(handleMessage(msg, sender));
    });
};
