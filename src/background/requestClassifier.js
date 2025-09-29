/* requestClassifier.js
 * Build normalized request event objects.
 */
import { getHost, getETLD1, isThirdParty } from './domainUtils.js';

function classifyRequest(details, topSiteETLD1){
  const requestUrl = details.url;
  const requestHost = getHost(requestUrl);
  const requestETLD1 = getETLD1(requestHost);
  const thirdParty = isThirdParty(topSiteETLD1, requestETLD1);
  return {
    topSite: topSiteETLD1,
    requestUrl,
    requestHost,
    requestETLD1,
    type: details.type,
    thirdParty,
    blocked: false,
    time: Date.now()
  };
}

export { classifyRequest };
