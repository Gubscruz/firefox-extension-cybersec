/* cookieSyncDetector.js
 * Detect cookie syncing by comparing hashed cookie values with outgoing third-party request params.
 */
import { loadRules } from './storage.js';

async function sha1Hex(str){
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-1', enc.encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function buildCookieHashMap(cookies){
  const map = {};
  for(const c of cookies){
    try { map[c.name] = await sha1Hex(c.value || ''); } catch(e){}
  }
  return map;
}

function parseParams(url){
  try {
    const u = new URL(url);
    const res = [];
    for(const [k,v] of u.searchParams.entries()) res.push(v);
    if(u.hash && u.hash.length>1){
      const h = u.hash.slice(1);
      h.split(/[&]/).forEach(p=>{
        const kv = p.split('=');
        if(kv[1]) res.push(kv[1]);
      });
    }
    return res;
  } catch(e){ return []; }
}

async function detectCookieSync(topSiteCookies, requestDetails, thirdPartyHost){
  const rules = await loadRules();
  const hashes = await buildCookieHashMap(topSiteCookies);
  const paramValues = parseParams(requestDetails.url);
  const matches = [];
  for(const [name, hval] of Object.entries(hashes)){
    for(const v of paramValues){
      if(!v) continue;
      if(rules.deepCookieSyncCheck && v === topSiteCookies.find(c=>c.name===name)?.value){
        matches.push({cookie:name, kind:'raw'});
        break;
      }
      // hash compare
      const hv = await sha1Hex(v);
      if(hv === hval){
        matches.push({cookie:name, kind:'hash'});
        break;
      }
    }
  }
  if(matches.length){
    return matches.map(m=>({
      topSite: requestDetails.topSite,
      sourceCookieName: m.cookie,
      recipientDomain: thirdPartyHost,
      kind: m.kind,
      time: Date.now()
    }));
  }
  return [];
}

export { detectCookieSync };
