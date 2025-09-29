/* hijackDetector.js
 * Evaluate simple heuristics for hijack indicators.
 */
function assessHijack(payload){
  // payload from content script {hookScripts:[], beforeUnload, popupFlood}
  const indicators = [];
  if(payload.hookScripts && payload.hookScripts.length) indicators.push('hookScript');
  if(payload.beforeUnload) indicators.push('beforeUnload');
  if(payload.popupFlood) indicators.push('popupFlood');
  return { suspect: indicators.length>0, indicators };
}

export { assessHijack };
