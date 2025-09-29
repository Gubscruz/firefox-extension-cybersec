// canvasHook.js - monkey patch canvas APIs to detect potential fingerprinting
(function(){
  const orig = {
    toDataURL: HTMLCanvasElement.prototype.toDataURL,
    toBlob: HTMLCanvasElement.prototype.toBlob,
    getImageData: CanvasRenderingContext2D.prototype.getImageData,
    measureText: CanvasRenderingContext2D.prototype.measureText
  };
  const stats = {reads:0, blobs:0, measures:0, suspect:false};
  let lastReads = [];
  function mark(){
    const now = Date.now();
    lastReads.push(now);
    lastReads = lastReads.filter(t=> now - t < 1000);
    if(lastReads.length > 10) stats.suspect = true;
  }
  HTMLCanvasElement.prototype.toDataURL = function(){ stats.reads++; mark(); return orig.toDataURL.apply(this, arguments); };
  HTMLCanvasElement.prototype.toBlob = function(){ stats.blobs++; mark(); return orig.toBlob.apply(this, arguments); };
  CanvasRenderingContext2D.prototype.getImageData = function(){ stats.reads++; mark(); return orig.getImageData.apply(this, arguments); };
  CanvasRenderingContext2D.prototype.measureText = function(){ stats.measures++; if(stats.measures>50) stats.suspect=true; return orig.measureText.apply(this, arguments); };
  window.__canvasFPStats = stats;
  setInterval(()=>{
    if(stats.reads || stats.blobs || stats.measures){
      browser.runtime.sendMessage({type:'CANVAS_ALERT', data: {...stats}}).catch(()=>{});
    }
  }, 3000);
})();
