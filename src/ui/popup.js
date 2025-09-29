// popup.js (non-module) uses global helpers from background page are not directly available here.
// Re-implement minimal host + eTLD+1 helpers for UI context only.
function uiGetHost(url) { try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; } }
function uiGetETLD1(host) { if (!host) return ''; const p = host.split('.'); if (p.length <= 2) return host; return p.slice(-2).join('.'); }

async function getActiveTab() {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
}

async function requestScore(tab) {
    const etld1 = uiGetETLD1(uiGetHost(tab.url));
    const resp = await browser.runtime.sendMessage({ type: 'SCORE_REQUEST', tabId: tab.id, topETLD1: etld1 });
    return { etld1, ...resp };
}

function renderScore(score) {
    document.getElementById('score').textContent = score.total;
    const ul = document.getElementById('scoreItems');
    ul.innerHTML = '';
    score.items.forEach(it => {
        const li = document.createElement('li');
        li.textContent = `${it.label}: ${it.value}`;
        ul.appendChild(li);
    });
}

function summarizeEvents(events) {
    let total = events.length;
    let third = events.filter(e => e.thirdParty).length;
    const uniqueThird = new Set(events.filter(e => e.thirdParty).map(e => e.requestETLD1));
    const blocked = events.filter(e => e.blocked);
    return { total, third, uniqueThird: uniqueThird.size, blocked: blocked.map(b => b.requestHost) };
}

async function init() {
    const tab = await getActiveTab();
    document.getElementById('site').textContent = new URL(tab.url).hostname;
    const { score, summary } = await requestScore(tab);
    renderScore(score);
    const events = await browser.storage.local.get(`events:${tab.id}`);
    const evArr = events[`events:${tab.id}`] || [];
    const reqSum = summarizeEvents(evArr);
    document.getElementById('requestsSummary').textContent = `Total: ${reqSum.total} | 3rd-party: ${reqSum.third} | Unique 3rd: ${reqSum.uniqueThird}`;
    const bl = document.getElementById('blockedList');
    reqSum.blocked.slice(-10).forEach(h => { const li = document.createElement('li'); li.textContent = h; bl.appendChild(li); });

    // cookies
    if (summary.cookies) {
        let fpS = 0, fpP = 0, tpS = 0, tpP = 0;
        for (const c of summary.cookies) {
            if (c.thirdParty) { if (c.session) tpS++; else tpP++; }
            else { if (c.session) fpS++; else fpP++; }
        }
        document.getElementById('cookiesSummary').textContent = `1st S:${fpS} P:${fpP} | 3rd S:${tpS} P:${tpP}`;
    }
    // storage
    if (summary.html5) {
        const s = summary.html5;
        document.getElementById('storageSummary').textContent = `LS:${s.localStorageKeys.length} SS:${s.sessionStorageKeys.length} IDB:${s.indexedDBDatabases.length} Cache:${s.cacheBuckets.length}`;
    }
    // alerts
    const alerts = [];
    if (summary.canvas?.suspect) alerts.push('Canvas FP');
    if ((summary.cookieSync || []).length) alerts.push('Cookie Sync');
    if (summary.hijack?.suspect) alerts.push('Hijack');
    if (alerts.length) {
        const a = document.getElementById('alerts');
        a.classList.remove('hidden');
        alerts.forEach(t => { const span = document.createElement('span'); span.className = 'badge'; span.textContent = t; a.appendChild(span); });
    }

    document.getElementById('openReport').addEventListener('click', () => {
        browser.tabs.create({ url: browser.runtime.getURL('src/ui/report.html') + `?site=${encodeURIComponent(summary.etld1 || '')}` });
    });
    document.getElementById('toggleBlock').textContent = 'Toggle Block (stub)';
    document.getElementById('tempAllow').textContent = 'Temp Allow (stub)';
}

document.addEventListener('DOMContentLoaded', init);
