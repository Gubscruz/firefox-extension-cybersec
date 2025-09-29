/* requestClassifier.js
 * Build normalized request event objects.
 */
// Uses global getHost/getETLD1/isThirdParty

self.classifyRequest = function classifyRequest(details, topSiteETLD1) {
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
};
