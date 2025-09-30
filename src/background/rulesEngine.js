/* rulesEngine.js
 * Determine if a host is a tracker and whether it should be blocked.
 */
// Uses global loadRules() and trackerDomains defined on self.

function hostMatchesPattern(host, pattern) {
    if (pattern.startsWith('*.')) {
        const bare = pattern.slice(2);
        return host === bare || host.endsWith('.' + bare);
    }
    return host === pattern;
}

function compileRegex(pattern) {
    try { return new RegExp(pattern); } catch (e) { return null; }
}

self.compiledTrackerRegex = (self.trackerDomains || []).filter(t => t.regex).map(t => ({ re: compileRegex(t.regex), raw: t })).filter(o => o.re);

self.isTracker = function isTracker(host) {
    host = host.toLowerCase();
    if ((self.trackerDomains || []).some(t => t.domain && (host === t.domain || host.endsWith('.' + t.domain)))) return true;
    for (const { re } of self.compiledTrackerRegex) {
        if (re.test(host)) return true;
    }
    return false;
}

self.shouldBlock = async function shouldBlock(host, topSite) {
    const rules = await loadRules();
    if (!rules.enabled) return false;
    // Per-site full disable
    if (rules.site && rules.site.disabled && rules.site.disabled.includes(topSite)) return false;
    // Temporary allow window for this site?
    if (rules.site && rules.site.tempAllows) {
        const until = rules.site.tempAllows[topSite];
        if (until && Date.now() < until) return false; // skip blocking while temp allow active
    }
    const h = host.toLowerCase();
    // allow overrides first
    if (rules.allow && rules.allow.some(p => hostMatchesPattern(h, p))) return false;
    // block overrides
    if (rules.block && rules.block.some(p => hostMatchesPattern(h, p))) return true;
    // regex overrides
    if (rules.regex) {
        for (const r of rules.regex) {
            try { if (new RegExp(r).test(h)) return true; } catch (e) { }
        }
    }
    // tracker membership
    return isTracker(h);
}

// Exposed on self
