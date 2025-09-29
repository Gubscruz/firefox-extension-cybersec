/* score.js
 * Compute privacy score with breakdown.
 */
function computeScore(metrics){
  // metrics shape {
  // uniqueThirdPartyDomains:Set, trackerDomains:Set, thirdPartyCookies, firstPartyPersistentCookies,
  // canvasSuspect, cookieSyncCount, hijackSuspect
  // }
  let total = 100;
  const items = [];
  const uniqThird = metrics.uniqueThirdPartyDomains.size;
  const thirdPenalty = -Math.min(20, uniqThird * 1);
  total += thirdPenalty; items.push({label:'3rd-party domains', value: thirdPenalty});

  const trackerPenalty = -Math.min(30, metrics.trackerDomains.size * 2);
  total += trackerPenalty; items.push({label:'Tracker domains', value: trackerPenalty});

  const tpcPenalty = -Math.min(15, metrics.thirdPartyCookies * 1);
  total += tpcPenalty; items.push({label:'3rd-party cookies', value: tpcPenalty});

  const fppPenalty = -Math.min(5, metrics.firstPartyPersistentCookies * 0.5);
  total += fppPenalty; items.push({label:'1st-party persistent cookies', value: fppPenalty});

  if(metrics.canvasSuspect){ total -= 10; items.push({label:'Canvas fingerprinting', value:-10}); }
  if(metrics.cookieSyncCount>0){ total -= 15; items.push({label:'Cookie syncing', value:-15}); }
  if(metrics.hijackSuspect){ total -= 15; items.push({label:'Hijack indicators', value:-15}); }

  if(total < 0) total = 0;
  return { total: Math.round(total), items };
}

export { computeScore };
