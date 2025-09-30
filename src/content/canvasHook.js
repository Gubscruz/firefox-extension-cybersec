// canvasHook.js - monkey patch canvas APIs to detect potential fingerprinting
/* canvasHook.js
 * NOTE: Content scripts in Firefox execute in an isolated world; modifying prototypes here does NOT always affect page scripts.
 * To reliably hook fingerprinting calls, we inject a <script> element so the code runs in the page context and then bridge
 * results back via window.postMessage, which we listen for from the content script side and forward to the background.
 */
(function injectCanvasFPBridge(){
  const INJECT_FLAG = '__privacyShieldCanvasInjected';
  if (window[INJECT_FLAG]) return; // avoid double-inject
  window[INJECT_FLAG] = true;

  // Listener in the (content script) isolated world to forward page messages
  window.addEventListener('message', ev => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || d.__psCanvasMsg !== true) return;
    browser.runtime.sendMessage({ type:'CANVAS_ALERT', data: d.payload }).catch(()=>{});
  });

  const injectedCode = `(() => {\n    try {\n      if (!window.HTMLCanvasElement || !window.CanvasRenderingContext2D) return;\n      const orig = {\n        toDataURL: HTMLCanvasElement.prototype.toDataURL,\n        toBlob: HTMLCanvasElement.prototype.toBlob,\n        getImageData: CanvasRenderingContext2D.prototype.getImageData,\n        measureText: CanvasRenderingContext2D.prototype.measureText\n      };\n      const stats = { reads:0, blobs:0, measures:0, hiddenCount:0, suspect:false, reasons:[] };\n      let recentReads = [];\n      const recordReason = r => { if(!stats.reasons.includes(r)) stats.reasons.push(r); };\n      function markRead(){ const now=Date.now(); recentReads.push(now); recentReads = recentReads.filter(t=> now - t < 1000); if(recentReads.length >= 5){ stats.suspect = true; recordReason('rapid-multi-read'); } }\n      function isHidden(el){ try { const rect = el.getBoundingClientRect(); if(rect.width===0||rect.height===0) return true; const st = getComputedStyle(el); if(st && (st.display==='none'||st.visibility==='hidden'||parseFloat(st.opacity)===0)) return true; } catch(e){} return false; }\n      function checkHidden(el){ if(isHidden(el)){ stats.hiddenCount++; if(stats.hiddenCount>=1){ stats.suspect = true; recordReason('hidden-canvas'); } } }\n      HTMLCanvasElement.prototype.toDataURL = function(){ checkHidden(this); stats.reads++; markRead(); return orig.toDataURL.apply(this, arguments); };\n      HTMLCanvasElement.prototype.toBlob = function(){ checkHidden(this); stats.blobs++; markRead(); return orig.toBlob.apply(this, arguments); };\n      CanvasRenderingContext2D.prototype.getImageData = function(){ const c=this.canvas; if(c) checkHidden(c); stats.reads++; markRead(); return orig.getImageData.apply(this, arguments); };\n      CanvasRenderingContext2D.prototype.measureText = function(){ stats.measures++; if(stats.measures>=20){ stats.suspect = true; recordReason('many-measureText'); } return orig.measureText.apply(this, arguments); };\n      function emit(){ if(!(stats.reads||stats.blobs||stats.measures)) return; window.postMessage({ __psCanvasMsg:true, payload:{ reads:stats.reads, blobs:stats.blobs, measures:stats.measures, hiddenCount:stats.hiddenCount, suspect:stats.suspect, reasons:stats.reasons } }, '*'); }\n      setInterval(emit, 3000);\n    } catch(e){ /* swallow */ }\n  })();`;

  const s = document.createElement('script');
  s.textContent = injectedCode;
  (document.documentElement || document.head || document.body).appendChild(s);
  s.remove();
})();
