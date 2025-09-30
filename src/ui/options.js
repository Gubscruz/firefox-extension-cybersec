// options.js non-module; replicate minimal rule load/save via storage keys.
async function loadRules() {
    const r = await browser.storage.local.get('rules:user');
    if (!r['rules:user']) return { enabled: true, deepCookieSyncCheck: false, allow: [], block: [], regex: [] };
    return r['rules:user'];
}
async function saveRules(rules) { await browser.storage.local.set({ 'rules:user': rules }); }

function renderLists(rules) {
    const allowUl = document.getElementById('allowList');
    const blockUl = document.getElementById('blockList');
    const regexUl = document.getElementById('regexList');
    allowUl.innerHTML = blockUl.innerHTML = regexUl.innerHTML = '';
    rules.allow.forEach(p => allowUl.appendChild(makeLi(p, 'allow')));
    rules.block.forEach(p => blockUl.appendChild(makeLi(p, 'block')));
    rules.regex.forEach(p => regexUl.appendChild(makeLi(p, 'regex')));
    document.getElementById('enabled').checked = rules.enabled;
    document.getElementById('deepCheck').checked = rules.deepCookieSyncCheck;
}

function makeLi(pattern, list) {
    const li = document.createElement('li');
    const span = document.createElement('span'); span.textContent = pattern; li.appendChild(span);
    const btn = document.createElement('button'); btn.textContent = 'x'; btn.addEventListener('click', async () => {
        const rules = await loadRules();
        rules[list] = rules[list].filter(p => p !== pattern);
        await saveRules(rules); renderLists(rules);
    });
    li.appendChild(btn);
    return li;
}

async function addRule() {
    const inp = document.getElementById('ruleInput');
    const val = inp.value.trim(); if (!val) return;
    const rules = await loadRules();
    if (val.startsWith('regex:')) {
        const expr = val.slice(6).replace(/^\/(.*)\/$/, '$1');
        try { new RegExp(expr); } catch (e) { alert('Invalid regex'); return; }
        if (!rules.regex.includes(expr)) rules.regex.push(expr);
    } else if (val.startsWith('allow:')) {
        const p = val.slice(6); if (!rules.allow.includes(p)) rules.allow.push(p);
    } else if (val.startsWith('block:')) {
        const p = val.slice(6); if (!rules.block.includes(p)) rules.block.push(p);
    } else {
        // decide allow vs block? default block list addition for convenience
        if (!rules.block.includes(val)) rules.block.push(val);
    }
    await saveRules(rules); inp.value = ''; renderLists(rules);
}

async function exportRules() {
    const rules = await loadRules();
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'privacy-shield-rules.json'; a.click();
    URL.revokeObjectURL(url);
}

function importRules() {
    document.getElementById('importFile').click();
}

async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    try {
        const json = JSON.parse(text);
        if (json && typeof json === 'object') {
            await saveRules(json);
            renderLists(json);
        }
    } catch (err) { alert('Invalid JSON'); }
}

function renderCustomLists(rules) {
    const sel = document.getElementById('listSelect');
    sel.innerHTML = '';
    const lists = rules.customLists || {};
    const names = Object.keys(lists).sort();
    if (!names.length) { sel.innerHTML = '<option value="">(no lists)</option>'; return; }
    names.forEach(n => { const opt = document.createElement('option'); opt.value = n; opt.textContent = n; sel.appendChild(opt); });
    sel.dispatchEvent(new Event('change'));
}

async function refreshCustomListUI(selectedName) {
    const rules = await loadRules();
    if (!rules.customLists) rules.customLists = {};
    const sel = document.getElementById('listSelect');
    if (selectedName && !rules.customLists[selectedName]) selectedName = null;
    if (!selectedName) {
        const first = Object.keys(rules.customLists)[0];
        selectedName = first || '';
        sel.value = selectedName;
    }
    const list = rules.customLists[selectedName];
    const enabledEl = document.getElementById('listEnabled');
    const ul = document.getElementById('listPatterns');
    ul.innerHTML = '';
    if (!list) { enabledEl.checked = false; return; }
    enabledEl.checked = list.enabled !== false;
    (list.patterns || []).forEach(p => {
        const li = document.createElement('li');
        li.textContent = p;
        const btn = document.createElement('button'); btn.textContent = 'x'; btn.addEventListener('click', async () => {
            const r = await loadRules();
            const l = r.customLists[selectedName];
            l.patterns = l.patterns.filter(x => x !== p);
            await saveRules(r); refreshCustomListUI(selectedName);
        });
        li.appendChild(btn);
        ul.appendChild(li);
    });
}

async function createList() {
    const name = document.getElementById('newListName').value.trim();
    if (!name) return;
    const rules = await loadRules();
    if (!rules.customLists) rules.customLists = {};
    if (!rules.customLists[name]) rules.customLists[name] = { enabled: true, patterns: [] };
    await saveRules(rules);
    document.getElementById('newListName').value = '';
    renderCustomLists(rules);
    refreshCustomListUI(name);
}

async function addListPattern() {
    const sel = document.getElementById('listSelect');
    const name = sel.value;
    if (!name) return;
    const inp = document.getElementById('listPatternInput');
    const val = inp.value.trim(); if (!val) return;
    const rules = await loadRules();
    const list = rules.customLists[name];
    if (list && !list.patterns.includes(val)) list.patterns.push(val);
    await saveRules(rules);
    inp.value = '';
    refreshCustomListUI(name);
}

async function toggleListEnabled() {
    const sel = document.getElementById('listSelect');
    const name = sel.value; if (!name) return;
    const rules = await loadRules();
    const list = rules.customLists[name]; if (!list) return;
    list.enabled = document.getElementById('listEnabled').checked;
    await saveRules(rules);
}

async function removeList() {
    const sel = document.getElementById('listSelect');
    const name = sel.value; if (!name) return;
    if (!confirm(`Delete list "${name}"?`)) return;
    const rules = await loadRules();
    delete rules.customLists[name];
    await saveRules(rules);
    renderCustomLists(rules);
    refreshCustomListUI();
}

async function exportLists() {
    const rules = await loadRules();
    const lists = rules.customLists || {};
    const blob = new Blob([JSON.stringify(lists, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'privacy-shield-custom-lists.json'; a.click(); URL.revokeObjectURL(url);
}

function importLists() { document.getElementById('importListsFile').click(); }

async function handleImportLists(e) {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    try {
        const json = JSON.parse(text);
        if (!json || typeof json !== 'object') throw new Error('Invalid');
        const rules = await loadRules();
        rules.customLists = json; // replace; could merge if desired
        await saveRules(rules);
        renderCustomLists(rules);
        refreshCustomListUI();
    } catch (err) { alert('Invalid lists JSON'); }
}

async function init() {
    const rules = await loadRules();
    if (!rules.customLists) rules.customLists = {};
    renderLists(rules);
    renderCustomLists(rules);
    document.getElementById('addRule').addEventListener('click', addRule);
    document.getElementById('exportRules').addEventListener('click', exportRules);
    document.getElementById('importRules').addEventListener('click', importRules);
    document.getElementById('importFile').addEventListener('change', handleImport);
    document.getElementById('enabled').addEventListener('change', async (e) => { const r = await loadRules(); r.enabled = e.target.checked; await saveRules(r); });
    document.getElementById('deepCheck').addEventListener('change', async (e) => { const r = await loadRules(); r.deepCookieSyncCheck = e.target.checked; await saveRules(r); });
    // custom list handlers
    document.getElementById('createList').addEventListener('click', createList);
    document.getElementById('addListPattern').addEventListener('click', addListPattern);
    document.getElementById('listEnabled').addEventListener('change', toggleListEnabled);
    document.getElementById('removeList').addEventListener('click', removeList);
    document.getElementById('exportLists').addEventListener('click', exportLists);
    document.getElementById('importLists').addEventListener('click', importLists);
    document.getElementById('importListsFile').addEventListener('change', handleImportLists);
    document.getElementById('listSelect').addEventListener('change', (e) => refreshCustomListUI(e.target.value));
}

document.addEventListener('DOMContentLoaded', init);
