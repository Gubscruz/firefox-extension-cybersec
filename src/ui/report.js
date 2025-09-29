// Re-implemented locally (no imports) – enumerates stored site summaries and per-tab event arrays.
async function getAllSiteSummaries() {
    const all = await browser.storage.local.get(null);
    const res = {};
    for (const k of Object.keys(all)) {
        if (k.startsWith('siteSummaries:')) res[k.split(':')[1]] = all[k];
    }
    return res;
}

function toCSV(rows) {
    return rows.map(r => r.map(f => '"' + (String(f).replace(/"/g, '""')) + '"').join(',')).join('\n');
}

function classifyEvent(ev) {
    if (ev.blocked) return 'blocked';
    if (ev.tracker) return 'tracker';
    return ev.thirdParty ? 'request-3p' : 'request-1p';
}

function getQueryParam(name) {
    const params = new URLSearchParams(location.search);
    return params.get(name) || '';
}

async function loadData() {
    const initialSite = getQueryParam('site');
    const all = await getAllSiteSummaries();
    const storageAll = await browser.storage.local.get(null);

    // Collect network events from all tabs (each key events:<tabId>)
    const eventsRows = [];
    for (const [k, v] of Object.entries(storageAll)) {
        if (k.startsWith('events:') && Array.isArray(v)) {
            for (const ev of v) {
                const site = ev.topSite || 'unknown';
                eventsRows.push([
                    classifyEvent(ev),
                    site,
                    ev.requestHost || '',
                    `${ev.type}${ev.thirdParty ? ' 3P' : ' 1P'}${ev.tracker ? ' tracker' : ''}`,
                    ev.time || Date.now()
                ]);
            }
        }
    }
    // Add alert-style aggregated events
    for (const [site, summary] of Object.entries(all)) {
        if (summary.cookieSync) {
            for (const ev of summary.cookieSync) {
                eventsRows.push(['cookieSync', site, ev.recipientDomain, `${ev.sourceCookieName} (${ev.kind})`, ev.time]);
            }
        }
        if (summary.canvas) {
            eventsRows.push(['canvas', site, '', `reads:${summary.canvas.reads} measures:${summary.canvas.measures}`, Date.now()]);
        }
        if (summary.hijack?.suspect) {
            eventsRows.push(['hijack', site, '', (summary.hijack.indicators || []).join('|'), Date.now()]);
        }
    }

    // Sort by time ascending
    eventsRows.sort((a, b) => a[4] - b[4]);

    const select = document.getElementById('siteFilter');
    const siteSet = new Set(eventsRows.map(r => r[1]));
    // merge with summaries list
    Object.keys(all).forEach(s => siteSet.add(s));
    const sites = Array.from(siteSet).filter(Boolean).sort();
    select.innerHTML = '<option value="">(All Sites)</option>' + sites.map(s => `<option${s === initialSite ? ' selected' : ''}>${s}</option>`).join('');

    const tbody = document.querySelector('#eventsTable tbody');
    tbody.innerHTML = '';
    for (const row of eventsRows) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(row[4]).toLocaleTimeString()}</td><td>${row[0]}</td><td>${row[2] || ''}</td><td>${row[3]}</td>`;
        tr.dataset.site = row[1];
        tbody.appendChild(tr);
    }
    if (!eventsRows.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" style="text-align:center;opacity:.7;">No data collected yet. Browse some pages and reopen.</td>';
        tbody.appendChild(tr);
    }

    function applyFilter() {
        const site = select.value;
        for (const tr of tbody.querySelectorAll('tr')) {
            if (tr.children.length && tr.children[0].colSpan === 4) continue; // skip message row
            tr.style.display = !site || tr.dataset.site === site ? '' : 'none';
        }
    }
    select.addEventListener('change', applyFilter);
    if (initialSite) applyFilter();

    document.getElementById('exportCsv').addEventListener('click', () => {
        const siteFilter = select.value;
        const filtered = eventsRows.filter(r => !siteFilter || r[1] === siteFilter);
        const csv = toCSV([["eventType", 'site', 'domain', 'details', 'time']].concat(filtered));
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'privacy-report.csv'; a.click(); URL.revokeObjectURL(url);
    });
}

document.addEventListener('DOMContentLoaded', loadData);
