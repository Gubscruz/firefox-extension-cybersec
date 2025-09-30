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
            const existing = await getSiteSummary(etld1) || {};
            existing.canvasFingerprint = {
                reads: msg.data.reads,
                blobs: msg.data.blobs,
                measures: msg.data.measures,
                hiddenCount: msg.data.hiddenCount,
                suspect: msg.data.suspect,
                reasons: msg.data.reasons || []
            };
            await setSiteSummary(etld1, existing);
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
                canvasSuspect: summary.canvasFingerprint?.suspect,
                cookieSyncCount: (summary.cookieSync || []).length,
                hijackSuspect: summary.hijack?.suspect
            });
            return { type: 'SCORE_RESPONSE', score, summary };
        }
        case 'SITE_TOGGLE_BLOCK': { // enable/disable blocking for this site by toggling membership in disabled list
            const rules = await loadRules();
            if (!rules.site) rules.site = { disabled: [], tempAllows: {} };
            const list = rules.site.disabled;
            const idx = list.indexOf(msg.etld1);
            if (idx === -1) list.push(msg.etld1); else list.splice(idx, 1);
            await saveRules(rules);
            return { ok: true, disabled: list.includes(msg.etld1) };
        }
        case 'SITE_TEMP_ALLOW': { // create/update temporary allow window (e.g., 5 minutes) or clear if existing
            const rules = await loadRules();
            if (!rules.site) rules.site = { disabled: [], tempAllows: {} };
            const current = rules.site.tempAllows[msg.etld1];
            if (current && Date.now() < current) {
                // clear
                delete rules.site.tempAllows[msg.etld1];
                await saveRules(rules);
                return { ok: true, tempAllowed: false };
            } else {
                const durationMs = msg.durationMs || 5 * 60 * 1000; // default 5 minutes
                rules.site.tempAllows[msg.etld1] = Date.now() + durationMs;
                await saveRules(rules);
                return { ok: true, tempAllowed: true, until: rules.site.tempAllows[msg.etld1] };
            }
        }
    }
};

self.initMessaging = function initMessaging() {
    browser.runtime.onMessage.addListener((msg, sender) => {
        return Promise.resolve(handleMessage(msg, sender));
    });
};
