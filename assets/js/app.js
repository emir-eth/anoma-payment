
(function(){
'use strict';

/* ===== State ===== */
var currentStrategy = 'fast';
var lastIntent = null;
var lastQuote = null;

/* ===== Helpers ===== */
function $(id){ return document.getElementById(id); }
function on(el, ev, fn){ if (el) el.addEventListener(ev, fn); }
function copyText(t){
  try{ navigator.clipboard.writeText(t); showToast('Copied'); }
  catch(e){
    var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta);
    ta.select(); try{ document.execCommand('copy'); showToast('Copied'); }catch(e2){ alert('Copy failed'); }
    document.body.removeChild(ta);
  }
}
function showToast(msg){
  var box = $('toastBox'); if(!box){ alert(msg); return; }
  var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  box.appendChild(t); setTimeout(function(){ t.classList.add('show'); }, 20);
  setTimeout(function(){ t.classList.remove('show'); try{ box.removeChild(t);}catch(e){} }, 2000);
}
function base64urlEncode(s){
  var e = btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return e;
}
function base64urlDecode(s){
  s = s.replace(/-/g,'+').replace(/_/g,'/'); var pad = s.length % 4 ? 4 - s.length % 4 : 0;
  s += Array(pad+1).join('='); return decodeURIComponent(escape(atob(s)));
}
function makeIntentLink(intent){
  var json = JSON.stringify(intent);
  return location.origin + location.pathname + '?intent=' + base64urlEncode(json);
}
function GET(obj, path){
  if(obj==null) return undefined;
  var parts = String(path).split('.'); var cur = obj;
  for (var i=0;i<parts.length;i++){ if(cur==null) return undefined; cur = cur[parts[i]]; }
  return cur;
}


function tsNow(){
  try{
    return new Intl.DateTimeFormat('en-US', {
      year:'numeric', month:'short', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit',
      hour12:false
    }).format(new Date());
  }catch(e){
    // Fallback ISO-like
    return new Date().toISOString().replace('T',' ').slice(0,19);
  }
}
/* ===== Tabs ===== */
(function(){
  var tabs = document.querySelectorAll('.nav-btn');
  var sections = document.querySelectorAll('.tab');
  for (var i=0;i<tabs.length;i++){
    (function(btn){
      on(btn, 'click', function(){
        for (var j=0;j<tabs.length;j++) tabs[j].classList.remove('active');
        btn.classList.add('active');
        var id = btn.getAttribute('data-tab');
        for (var k=0;k<sections.length;k++) sections[k].classList.add('hidden');
        var sec = $('tab-' + id); if (sec) sec.classList.remove('hidden');
      });
    })(tabs[i]);
  }
})();

/* ===== Strategy Toggle (header & modal) ===== */
function setStrategy(s){
  currentStrategy = s || 'fast';
  var btns = document.querySelectorAll('.str-btn');
  for (var i=0;i<btns.length;i++){
    var b = btns[i]; var is = b.getAttribute('data-str');
    if (is === currentStrategy) b.classList.add('active'); else b.classList.remove('active');
  }
  var qStr = $('q_strategy'), qExp = $('q_explain');
  if (qStr) qStr.textContent = currentStrategy.toUpperCase();
  if (qExp){
    if (currentStrategy==='fast') qExp.textContent = 'Fastest delivery (express bridge, min hops)';
    else if (currentStrategy==='cheap') qExp.textContent = 'Lowest cost (aggregator + economy bridge)';
    else qExp.textContent = 'Privacy focused (shielded steps)';
  }
  refreshQuoteIfOpen();
}
(function bindStr(){
  var btns = document.querySelectorAll('.str-btn');
  for (var i=0;i<btns.length;i++){
    (function(b){
      on(b,'click', function(){ setStrategy(b.getAttribute('data-str')); });
    })(btns[i]);
  }
})();

/* ===== Activity ===== */
function activityList(){ try{ return JSON.parse(localStorage.getItem('anomaActivity') || '[]'); }catch(e){ return []; } }
function saveActivity(arr){ localStorage.setItem('anomaActivity', JSON.stringify(arr)); }
function renderActivity(){
  var list = $('activityList'); if(!list) return;
  var arr = activityList();
  var q = ($('actSearch') && $('actSearch').value) ? $('actSearch').value.toLowerCase() : '';
  function match(e){
    if(!q) return true;
    var s = (e.kind+' '+(e.amt||'')+' '+(e.asset||'')+' '+(e.from||'')+' '+(e.to||'')+' '+(e.toAddr||'')+' '+(e.ts||'')).toLowerCase();
    return s.indexOf(q)!==-1;
  }
  list.innerHTML = '';
  for (var i=0;i<arr.length;i++){
    var e = arr[i]; if(!match(e)) continue;
    var li = document.createElement('div'); li.className = 'activity-item';
    var kind = (e.kind||'').toLowerCase();
    var isIntent = /^(intent|intentpay|nfteXpress|subsafe|pay-on-proof|gasless)/i.test(e.kind||'');
    if (isIntent){
      var parts = [];
      var head = (e.kind||'Intent') + ' — ';
      var deliver = 'Deliver ' + (e.amt||'—') + (e.asset?(' '+e.asset):'');
      if (e.to) deliver += ' on ' + e.to;
      var tail = e.toAddr ? (' → ' + e.toAddr) : '';
      parts.push(head + deliver + tail);
      if (e.strategy) parts.push('• ' + e.strategy);
      if (e.qid) parts.push('• ' + e.qid);
      li.textContent = '[' + (e.ts||'') + '] ' + parts.join(' ');
    } else {
      li.textContent = '[' + (e.ts||'') + '] ' + (e.kind||'') + ' ' + (e.from||'') + '→' + (e.to||'') + ' ' + (e.amt||'') + ' ' + (e.toAddr||'');
    }
    list.appendChild(li);
  }
}
on($('actSearch'),'input', renderActivity);
on($('clearActivity'),'click', function(){ saveActivity([]); renderActivity(); });
on($('exportCSV'),'click', function(){
  var arr = activityList();
  var csv = 'time,kind,from,to,amount,asset,toAddress,strategy,quoteId\n';
  for (var i=0;i<arr.length;i++){
    var e = arr[i];
    csv += [e.ts||'', e.kind||'', e.from||'', e.to||'', e.amt||'', e.asset||'', e.toAddr||'', e.strategy||'', e.qid||''].join(',') + '\n';
  }
  var blob = new Blob([csv], {type:'text/csv'}); var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = 'activity.csv'; a.click(); URL.revokeObjectURL(url);
});
renderActivity();

/* ===== Send ===== */
on($('switchBtn'), 'click', function(){
  var from = $('fromChain'), to = $('toChain'); if(!from||!to) return; var t = from.value; from.value = to.value; to.value = t;
});
on($('sendBtn'), 'click', function(){
  var from = $('fromChain') ? $('fromChain').value : '—';
  var to = $('toChain') ? $('toChain').value : '—';
  var amt = $('amount') ? ($('amount').value || '0') : '0';
  var toAddr = $('toAddress') ? ($('toAddress').value || '—') : '—';
  var ts = tsNow();
  var entry = { ts: ts, kind:'Send(demo)', from: from, to: to, amt: amt, toAddr: toAddr };
  var arr = activityList(); arr.unshift(entry); saveActivity(arr); renderActivity(); showToast('Demo entry added');
});
on($('connectBtn'),'click', function(){ showToast('Wallet connect (demo)'); });

/* ===== Receive (QR) ===== */
function buildPaymentURI(d){
  var u = 'anoma:' + (d.chain||'') + ':' + (d.address||''); var q = [];
  if(d.amount) q.push('amount=' + encodeURIComponent(d.amount));
  if(d.memo) q.push('memo=' + encodeURIComponent(d.memo));
  if(q.length) u += '?' + q.join('&'); return u;
}
function getRecv(){
  return {
    chain: $('recvChain')? $('recvChain').value.trim() : '',
    amount: $('recvAmount')? $('recvAmount').value.trim() : '',
    address: $('recvAddress')? $('recvAddress').value.trim() : '',
    memo: $('recvMemo')? $('recvMemo').value.trim() : ''
  };
}
function makePseudoQRSVG(text){
  var size = 180, cells = 21, cell = Math.floor(size/cells);
  var svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">',
             '<rect width="'+size+'" height="'+size+'" fill="#fff"/><g fill="#111">'];
  var seed = 0; for (var i=0;i<text.length;i++) seed = (seed*131 + text.charCodeAt(i)) & 0xffffffff;
  for (var y=0;y<cells;y++){
    for (var x=0;x<cells;x++){
      seed = (seed*1664525 + 1013904223) & 0xffffffff;
      if (((seed>>>24) & 1)===1) svg.push('<rect x="'+(x*cell)+'" y="'+(y*cell)+'" width="'+cell+'" height="'+cell+'"/>');
    }
  }
  svg.push('</g></svg>'); return svg.join('');
}
on($('genQR'),'click', function(){
  var d = getRecv(); var uri = buildPaymentURI(d);
  var box = $('qrBox'); if(!box) return; box.innerHTML = makePseudoQRSVG(uri);
});
on($('copyLink'),'click', function(){
  var d = getRecv(); copyText(buildPaymentURI(d));
});
on($('downloadQR'),'click', function(){
  var d = getRecv(); var uri = buildPaymentURI(d); var svg = makePseudoQRSVG(uri);
  var blob = new Blob([svg], {type:'image/svg+xml'}); var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = 'qr.svg'; a.click(); URL.revokeObjectURL(url);
});

/* ===== Intents ===== */
function intentFromSendForm(){
  return {
    kind: 'IntentPay',
    objective: {
      deliver: {
        amount: $('amount')? $('amount').value : '0',
        asset: $('toAsset')? $('toAsset').value : 'USDC',
        chain: $('toChain')? $('toChain').value : 'BASE'
      },
      recipient: $('toAddress')? $('toAddress').value : ''
    },
    constraints: {},
    preferences: { strategy: currentStrategy }
  };
}
on($('createIntentBtn'),'click', function(){
  lastIntent = intentFromSendForm();
  openIntentModal('IntentPay JSON (from Send)', lastIntent);
});
function openTemplate(makeObj, title){
  lastIntent = makeObj();
  openIntentModal(title, lastIntent);
}
on($('ip_create'), 'click', function(){ openTemplate(function(){ return intentFromSendForm(); }, 'IntentPay'); });
on($('nx_create'), 'click', function(){
  return openTemplate(function(){
    return { kind:'NFTeXpress', objective:{ nft: { url: ($('nftURL')? $('nftURL').value : ''), max: { amount:'0.8', asset:'SOL' } }, recipient: ($('nftBuyer')? $('nftBuyer').value : '') }, preferences:{ strategy: currentStrategy } };
  }, 'NFTeXpress');
});
on($('ss_create'), 'click', function(){
  return openTemplate(function(){
    return { kind:'SubSafe', objective:{ deliver:{ amount:'20', asset:'USDC', chain:'BASE' }, recipient: ($('subRecv')? $('subRecv').value : '') }, constraints:{ schedule:'monthly', capTotal:'260' }, preferences:{ strategy: currentStrategy } };
  }, 'SubSafe');
});
on($('pp_create'), 'click', function(){
  return openTemplate(function(){
    return { kind:'Pay-on-Proof', objective:{ when:'delivery:proof', deliver:{ amount:'0.15', asset:'ETH', chain:'ETH' }, recipient: ($('ppRecv')? $('ppRecv').value : '') }, preferences:{ strategy: currentStrategy } };
  }, 'Pay-on-Proof');
});
on($('gi_create'), 'click', function(){
  return openTemplate(function(){
    return { kind:'GaslessInvoice', objective:{ deliver:{ amount: ($('giAmount')? $('giAmount').value : '0'), asset:'USDC', chain:'BASE' }, recipient: ($('giRecv')? $('giRecv').value : '') }, preferences:{ strategy: currentStrategy } };
  }, 'Gasless Invoice');
});

/* ===== Modal / Quote / Lint / API ===== */
function openIntentModal(title, intent){
  lastIntent = intent; $('modalTitle').textContent = title;
  var mc = $('modalContent'); if (mc){ mc.textContent = JSON.stringify(intent, null, 2); }
  var qv = $('quoteView'); if (qv){ qv.classList.add('hidden'); }
  var lb = $('lintBox'); if (lb){ var warns = lintIntent(intent); lb.innerHTML = (warns.length? ('• ' + warns.join('<br>• ')) : '✓ Intent looks valid'); }
  var ab = $('apiBox'); if (ab){ ab.textContent = buildApiStub(intent); }
  $('modal').classList.remove('hidden');
  setStrategy(currentStrategy);
}
on($('modalClose'),'click', function(){ $('modal').classList.add('hidden'); });
on($('copyJson'),'click', function(){ if(lastIntent) copyText(JSON.stringify(lastIntent)); });
on($('copyCurl'),'click', function(){
  var t = $('curlText'); if (t){ copyText(t.textContent || t.value || ''); }
});
on($('showQR'),'click', function(){
  var img = $('deepQR'); if(!img || !lastIntent) return;
  var link = makeIntentLink(lastIntent); var svg = makePseudoQRSVG(link);
  var blob = new Blob([svg], {type:'image/svg+xml'}); var url = URL.createObjectURL(blob);
  img.src = url;
});
on($('getQuote'),'click', function(){
  if(!lastIntent){ showToast('Create an intent first'); return; }
  lastQuote = makeDeterministicQuote(lastIntent, currentStrategy);
  var _qv = $('quoteView'); if(_qv){ _qv.classList.remove('hidden'); }
  if ($('q_eta')) $('q_eta').textContent = Math.round(lastQuote.etaMs/1000) + 's';
  if ($('q_cost')) $('q_cost').textContent = '$' + lastQuote.totalCostUsd;
  if ($('q_id')) $('q_id').textContent = lastQuote.quoteId;
  if ($('modalStrategy')) $('modalStrategy').textContent = currentStrategy.toUpperCase();
  if ($('q_strategy')) $('q_strategy').textContent = currentStrategy.toUpperCase();
  renderRoute(lastQuote);
  var curl = buildCurl(lastIntent); var openapi = buildOpenAPI();
  if ($('curlText')) $('curlText').textContent = curl;
  if ($('openapiText')) $('openapiText').textContent = openapi;
});
function refreshQuoteIfOpen(){
  var modal = $('modal'); if (!modal || modal.classList.contains('hidden')) return;
  if (!lastIntent) return;
  lastQuote = makeDeterministicQuote(lastIntent, currentStrategy);
  if ($('q_eta')) $('q_eta').textContent = Math.round(lastQuote.etaMs/1000) + 's';
  if ($('q_cost')) $('q_cost').textContent = '$' + lastQuote.totalCostUsd;
  if ($('q_id')) $('q_id').textContent = lastQuote.quoteId;
  if ($('modalStrategy')) $('modalStrategy').textContent = currentStrategy.toUpperCase();
  if ($('q_strategy')) $('q_strategy').textContent = currentStrategy.toUpperCase();
  renderRoute(lastQuote);
}
on($('executeDemo'),'click', function(){
  var ts = tsNow();
  var from = $('fromChain') ? $('fromChain').value : '—';
  var to = (lastIntent && lastIntent.objective && lastIntent.objective.deliver && lastIntent.objective.deliver.chain) ? lastIntent.objective.deliver.chain : ($('toChain') ? $('toChain').value : '—');
  var amt = (lastIntent && lastIntent.objective && lastIntent.objective.deliver && lastIntent.objective.deliver.amount) ? lastIntent.objective.deliver.amount : ($('amount') ? $('amount').value : '—');
  var asset = (lastIntent && lastIntent.objective && lastIntent.objective.deliver && lastIntent.objective.deliver.asset) ? lastIntent.objective.deliver.asset : ($('toAsset') ? $('toAsset').value : '');
  var toAddr = (lastIntent && lastIntent.objective && lastIntent.objective.recipient) ? lastIntent.objective.recipient : ($('toAddress') ? $('toAddress').value : '—');
  var kind = (lastIntent && lastIntent.kind) ? lastIntent.kind : 'Intent';
  var strat = currentStrategy ? String(currentStrategy).toUpperCase() : '';
  var qid = (lastQuote && lastQuote.quoteId) ? lastQuote.quoteId : '';
  var rec = { ts: ts, kind: kind, from: from, to: to, amt: amt, asset: asset, toAddr: toAddr, strategy: strat, qid: qid };
  var arr = activityList(); arr.unshift(rec); saveActivity(arr); renderActivity();
  showToast('Demo execute added');
});

/* ===== Linter ===== */
function lintIntent(intent){
  var warns = [];
  try{
    if(!intent){ warns.push('Intent is empty.'); return warns; }
    var obj = GET(intent,'objective'); if(!obj) warns.push('objective missing');
    var deliver = GET(intent,'objective.deliver');
    if(!deliver){ warns.push('objective.deliver missing'); }
    else { if(!deliver.amount) warns.push('deliver.amount missing'); if(!deliver.asset) warns.push('deliver.asset missing'); if(!deliver.chain) warns.push('deliver.chain missing'); }
    var recip = GET(intent,'objective.recipient'); if(!recip) warns.push('recipient empty');
    var cap = GET(intent,'constraints.maxTotalCostUsd') || GET(intent,'constraints.capTotal'); if(!cap) warns.push('max total cost / cap not specified');
    var deadline = GET(intent,'constraints.deadline'); if(deadline){ var d = new Date(deadline).getTime(); if(!isNaN(d) && d - Date.now() < 120000) warns.push('deadline too soon (<2m)'); }
  }catch(e){ warns.push('Lint error: ' + e.message); }
  return warns;
}

/* ===== Route & Quote (demo) ===== */
function hashCode(str){ var h=2166136261>>>0; for (var i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = (h*16777619)>>>0; } return h>>>0; }
function makeDeterministicQuote(intent, strat){
  var seed = hashCode(JSON.stringify(intent) + '|' + strat);
  function rnd(){ seed = (seed*1664525 + 1013904223)>>>0; return seed/0xffffffff; }
  var baseEta = Math.floor(20 + rnd()*120);
  var baseCost = Math.round((0.5 + rnd()*5)*100)/100;
  if (strat==='fast'){ baseEta = Math.max(12, Math.floor(baseEta*0.6)); baseCost = Math.round((baseCost*1.3)*100)/100; }
  else if (strat==='cheap'){ baseEta = Math.floor(baseEta*1.4); baseCost = Math.round((baseCost*0.7)*100)/100; }
  else { baseEta = Math.floor(baseEta*1.2); baseCost = Math.round((baseCost*1.1)*100)/100; }
  var steps;
  if (strat==='fast'){ steps = [{type:'swap',chain:'SRC'},{type:'bridge',chain:'L1',note:'express'},{type:'swap',chain:'DST'}]; }
  else if (strat==='cheap'){ steps = [{type:'agg',chain:'SRC'},{type:'bridge',chain:'L1',note:'economy'},{type:'swap',chain:'DST'}]; }
  else { steps = [{type:'shield',chain:'SRC'},{type:'bridge',chain:'L1',note:'shielded'},{type:'swap',chain:'DST'}]; }
  return { quoteId: 'q_' + (hashCode(seed.toString()).toString(16)).slice(0,8), etaMs: baseEta*1000, totalCostUsd: baseCost.toFixed(2), steps: steps };
}
function renderRoute(q){
  var wrap = document.querySelector('#quoteView .route') || $('quoteView'); if (!wrap) return;
  wrap.innerHTML = '';
  var extra = document.createElement('div'); extra.className = 'route-line'; extra.innerHTML = '';
  for (var i=0;i<q.steps.length;i++){
    var s = q.steps[i];
    var b = document.createElement('span'); b.className = 'badge';
    var label = (s.type==='bridge' ? 'Bridge '+s.chain+(s.note? ' ('+s.note+')':'' ) : s.type==='agg' ? 'Aggregator @ '+s.chain : s.type==='shield' ? 'Shield @ '+s.chain : 'Swap @ '+s.chain);
    b.textContent = label; extra.appendChild(b);
    if (i<q.steps.length-1){ var arrow = document.createElement('span'); arrow.className = 'arrow'; arrow.textContent = '→'; extra.appendChild(arrow); }
  }
  wrap.appendChild(extra);
}

/* ===== API & cURL (demo) ===== */
function buildCurl(intent){
  var url = 'https://api.example.com/quotes';
  var body = JSON.stringify({ intent: intent }, null, 2);
  return 'curl -X POST ' + url + " \\\n  -H 'Content-Type: application/json' \\\n  -d '" + body.replace(/'/g,"'\\''") + "'";
}
function buildOpenAPI(){
  return [
'openapi: 3.0.0',
'info: { title: Anoma Demo, version: 0.0.1 }',
'paths:',
'  /quotes:',
'    post:',
'      requestBody: { required: true, content: { application/json: { schema: { type: object, properties: { intent: { type: object } } } } } }',
'      responses: { 200: { description: ok } }',
'  /execute:',
'    post:',
'      requestBody: { required: true, content: { application/json: { schema: { type: object, properties: { intent: { type: object }, quoteId: { type: string } } } } } }',
'      responses: { 200: { description: ok } }'
].join('\n');
}
function buildApiStub(intent){
  return 'POST /quotes\\nPOST /execute\\n' + JSON.stringify(intent, null, 2);
}

/* ===== Deep link boot ===== */
(function openIntentFromQuery(){
  try{
    var p = new URL(location.href).searchParams.get('intent');
    if(!p) return;
    var json = JSON.parse(base64urlDecode(p));
    lastIntent = json;
    openIntentModal('Intent (Deep Link)', json);
  }catch(e){}
})();

/* ===== PWA (SW) ===== */
if ('serviceWorker' in navigator) {
  try {
    var _isHTTP = (location.protocol === 'https:' || location.protocol === 'http:' || location.hostname === 'localhost');
    if (_isHTTP) { navigator.serviceWorker.register('sw.js').catch(function(){}); }
  } catch(e) {}
}

})(); // end IIFE
