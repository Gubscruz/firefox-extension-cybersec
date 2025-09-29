/* domainUtils.js
 * Utilities for extracting host and eTLD+1 with a tiny embedded public suffix subset.
 * Falls back to last two labels if unknown.
 */
const PSL_SUBSET = new Set([
  'com','org','net','edu','gov','io','co.uk','uk','dev','app','co','info','br','com.br','net.br','org.br','xyz','online','site','ai','ca','de','fr','es','it','nl','se','no','fi','pl','ru','jp','kr','cn'
]);

function getHost(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch(e){ return ''; }
}

function getETLD1(host){
  if(!host) return '';
  const parts = host.split('.');
  if(parts.length <=2) return host;
  // try longest matching suffix (e.g., co.uk)
  for(let i=1;i<parts.length;i++){
    const slice = parts.slice(i).join('.');
    if(PSL_SUBSET.has(slice)){
      const prev = parts[i-1];
      return prev + '.' + slice;
    }
  }
  // fallback last two labels
  return parts.slice(-2).join('.');
}

function isThirdParty(topETLD1, hostETLD1){
  return !!topETLD1 && !!hostETLD1 && topETLD1 !== hostETLD1;
}

export { getHost, getETLD1, isThirdParty };
