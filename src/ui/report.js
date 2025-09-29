import { getAllSiteSummaries, getEvents } from '../background/storage.js';

function toCSV(rows){
  return rows.map(r=> r.map(f=> '"'+(String(f).replace(/"/g,'""'))+'"').join(',')).join('\n');
}

async function loadData(){
  const all = await getAllSiteSummaries();
  const select = document.getElementById('siteFilter');
  select.innerHTML = '<option value="">(All Sites)</option>' + Object.keys(all).map(s=>`<option>${s}</option>`).join('');
  const eventsRows = [];
  const tbody = document.querySelector('#eventsTable tbody');
  tbody.innerHTML='';
  for(const [site, summary] of Object.entries(all)){
    if(summary.cookieSync){
      for(const ev of summary.cookieSync){
        eventsRows.push(['cookieSync', site, ev.recipientDomain, `${ev.sourceCookieName} (${ev.kind})`, ev.time]);
      }
    }
    if(summary.canvas){
      eventsRows.push(['canvas', site, '', `reads:${summary.canvas.reads} measures:${summary.canvas.measures}`, Date.now()]);
    }
    if(summary.hijack?.suspect){
      eventsRows.push(['hijack', site, '', summary.hijack.indicators.join('|'), Date.now()]);
    }
  }
  // network events: need to iterate per tab? We cannot get all tab IDs reliably here -> simplified omitted for brevity.
  for(const row of eventsRows){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(row[4]).toLocaleTimeString()}</td><td>${row[0]}</td><td>${row[2]||''}</td><td>${row[3]}</td>`;
    tr.dataset.site = row[1];
    tbody.appendChild(tr);
  }
  document.getElementById('exportCsv').addEventListener('click', ()=>{
    const siteFilter = select.value;
    const filtered = eventsRows.filter(r=> !siteFilter || r[1]===siteFilter);
    const csv = toCSV([['eventType','site','domain','details','time']].concat(filtered));
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='privacy-report.csv'; a.click(); URL.revokeObjectURL(url);
  });
  select.addEventListener('change', ()=>{
    const site = select.value;
    for(const tr of tbody.querySelectorAll('tr')){
      tr.style.display = !site || tr.dataset.site===site ? '' : 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', loadData);
