import { loadRules, saveRules } from '../background/storage.js';

function renderLists(rules){
  const allowUl = document.getElementById('allowList');
  const blockUl = document.getElementById('blockList');
  const regexUl = document.getElementById('regexList');
  allowUl.innerHTML= blockUl.innerHTML= regexUl.innerHTML='';
  rules.allow.forEach(p=> allowUl.appendChild(makeLi(p, 'allow')));
  rules.block.forEach(p=> blockUl.appendChild(makeLi(p, 'block')));
  rules.regex.forEach(p=> regexUl.appendChild(makeLi(p, 'regex')));
  document.getElementById('enabled').checked = rules.enabled;
  document.getElementById('deepCheck').checked = rules.deepCookieSyncCheck;
}

function makeLi(pattern, list){
  const li = document.createElement('li');
  const span = document.createElement('span'); span.textContent = pattern; li.appendChild(span);
  const btn = document.createElement('button'); btn.textContent='x'; btn.addEventListener('click', async ()=>{
    const rules = await loadRules();
    rules[list] = rules[list].filter(p=>p!==pattern);
    await saveRules(rules); renderLists(rules);
  });
  li.appendChild(btn);
  return li;
}

async function addRule(){
  const inp = document.getElementById('ruleInput');
  const val = inp.value.trim(); if(!val) return;
  const rules = await loadRules();
  if(val.startsWith('regex:')){
    const expr = val.slice(6).replace(/^\/(.*)\/$/, '$1');
    try { new RegExp(expr); } catch(e){ alert('Invalid regex'); return; }
    if(!rules.regex.includes(expr)) rules.regex.push(expr);
  } else if(val.startsWith('allow:')){
    const p = val.slice(6); if(!rules.allow.includes(p)) rules.allow.push(p);
  } else if(val.startsWith('block:')){
    const p = val.slice(6); if(!rules.block.includes(p)) rules.block.push(p);
  } else {
    // decide allow vs block? default block list addition for convenience
    if(!rules.block.includes(val)) rules.block.push(val);
  }
  await saveRules(rules); inp.value=''; renderLists(rules);
}

async function exportRules(){
  const rules = await loadRules();
  const blob = new Blob([JSON.stringify(rules,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='privacy-shield-rules.json'; a.click();
  URL.revokeObjectURL(url);
}

function importRules(){
  document.getElementById('importFile').click();
}

async function handleImport(e){
  const file = e.target.files[0]; if(!file) return;
  const text = await file.text();
  try {
    const json = JSON.parse(text);
    if(json && typeof json === 'object'){
      await saveRules(json);
      renderLists(json);
    }
  } catch(err){ alert('Invalid JSON'); }
}

async function init(){
  const rules = await loadRules();
  renderLists(rules);
  document.getElementById('addRule').addEventListener('click', addRule);
  document.getElementById('exportRules').addEventListener('click', exportRules);
  document.getElementById('importRules').addEventListener('click', importRules);
  document.getElementById('importFile').addEventListener('change', handleImport);
  document.getElementById('enabled').addEventListener('change', async (e)=>{ const r= await loadRules(); r.enabled = e.target.checked; await saveRules(r); });
  document.getElementById('deepCheck').addEventListener('change', async (e)=>{ const r= await loadRules(); r.deepCookieSyncCheck = e.target.checked; await saveRules(r); });
}

document.addEventListener('DOMContentLoaded', init);
