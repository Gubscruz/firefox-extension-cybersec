/* rulesEngine.js
 * Determine if a host is a tracker and whether it should be blocked.
 */
import { loadRules } from './storage.js';
import { trackerDomains } from '../rules/tracker_domains.js';

function hostMatchesPattern(host, pattern){
  if(pattern.startsWith('*.')){
    const bare = pattern.slice(2);
    return host === bare || host.endsWith('.'+bare);
  }
  return host === pattern;
}

function compileRegex(pattern){
  try { return new RegExp(pattern); } catch(e){ return null; }
}

const compiledTrackerRegex = trackerDomains.filter(t=>t.regex).map(t=>({re: compileRegex(t.regex), raw: t})).filter(o=>o.re);

function isTracker(host){
  host = host.toLowerCase();
  if(trackerDomains.some(t => t.domain && (host === t.domain || host.endsWith('.'+t.domain)))) return true;
  for(const {re} of compiledTrackerRegex){
    if(re.test(host)) return true;
  }
  return false;
}

async function shouldBlock(host, topSite){
  const rules = await loadRules();
  if(!rules.enabled) return false;
  const h = host.toLowerCase();
  // allow overrides first
  if(rules.allow && rules.allow.some(p=>hostMatchesPattern(h,p))) return false;
  // block overrides
  if(rules.block && rules.block.some(p=>hostMatchesPattern(h,p))) return true;
  // regex overrides
  if(rules.regex){
    for(const r of rules.regex){
      try { if(new RegExp(r).test(h)) return true; } catch(e){}
    }
  }
  // tracker membership
  return isTracker(h);
}

export { isTracker, shouldBlock };
