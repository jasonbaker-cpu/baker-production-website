// Gallery downloads (29 Oct 2026): every job gets "Download all" — a ZIP of every full-size image in that set,
// including the satellite / location maps (the editor's Export only covers the drone photos).
(function(){
  function load(){ return window.JSZip ? Promise.resolve() : new Promise(function(res,rej){ var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  function save(blob,name){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  function links(sec){ return Array.prototype.map.call(sec.querySelectorAll('.g a[href]'), function(a){ return a.getAttribute('href'); }); }
  async function zip(list, name, btn){
    var t=btn.textContent; btn.textContent='Preparing…'; btn.style.pointerEvents='none';
    try{ await load(); var z=new JSZip(), i=0;
      for (const h of list){ i++; btn.textContent='Preparing '+i+'/'+list.length+'…';
        const r=await fetch(h); if(!r.ok) continue; z.file(decodeURIComponent(h.split('?')[0]).replace(/\//g,'_'), await r.blob()); }
      save(await z.generateAsync({type:'blob'}), name); btn.textContent=t;
    }catch(e){ btn.textContent='Download failed — tap to retry'; }
    btn.style.pointerEvents='';
  }
  document.querySelectorAll('section').forEach(function(sec){
    var p=sec.querySelector('p'); if(!p||!sec.querySelector('.g a')) return;
    var slug=(sec.querySelector('.g a').getAttribute('href')||'job/').split('/')[0];
    var b=document.createElement('a'); b.className='ed'; b.href='#'; b.textContent='Download all';
    b.onclick=function(e){ e.preventDefault(); zip(links(sec), slug+'.zip', b); }; p.appendChild(b);
  });
})();
