/* TOQUIN APP · Recetas compartidas desde Juan Beltran. Solo lectura + edición de cantidades. */
(() => {
  'use strict';
  const FUNCTION_URL='https://sopvoedhxwuwbmvkysua.supabase.co/functions/v1/toquin-recipes';
  const FUNCTION_KEY='sb_publishable_KMKqGqxC27pXxKSufAf8QA_g5dqFKoH';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
  const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n(v));
  const pct=v=>(n(v)*100).toFixed(1).replace('.',',')+'%';
  let data=null, role='', selected=null, query='', category='all', timer=null, busy=false, root=null, lastError='', getAccessToken=null;
  const unitCost=i=>{const q=n(i.pack)*(n(i.yield||100)/100);return q>0?n(i.price)/q:0};
  const recipeById=(R,id)=>(R.recipes||[]).find(r=>r.id===id);
  const recipeCostPerPortion=(rec,R,path=new Set())=>{
    if(!rec||path.has(rec.id))return 0;
    const next=new Set(path);next.add(rec.id);
    const ings=Object.fromEntries((R.ingredients||[]).map(i=>[i.id,i]));
    const base=(rec.items||[]).reduce((sum,it)=>{
      const ing=ings[it.ing];
      if(ing)return sum+unitCost(ing)*n(it.qty);
      const sub=recipeById(R,it.ing);
      return sum+(sub?recipeCostPerPortion(sub,R,next)*n(it.qty):0);
    },0);
    return base*(1+n(rec.error??R.settings?.error)/100)/Math.max(n(rec.portions)||1,1);
  };
  const calc=(rec,R)=>{
    const ings=Object.fromEntries((R.ingredients||[]).map(i=>[i.id,i]));
    const lines=(rec.items||[]).map(it=>{
      const mp=ings[it.ing],sub=!mp&&(it.type==='recipe'||recipeById(R,it.ing)),subRec=sub?recipeById(R,it.ing):null;
      const uc=mp?unitCost(mp):subRec?recipeCostPerPortion(subRec,R,new Set([rec.id])):0;
      const ing=mp||(subRec?{id:subRec.id,name:subRec.name,unit:subRec.portionUnit||'porción',price:uc,pack:1,yield:100,subrecipe:true}:null);
      return {it,ing,uc,cost:uc*n(it.qty),subrecipe:!!subRec};
    });
    const base=lines.reduce((a,l)=>a+l.cost,0),err=n(rec.error??R.settings?.error)/100,total=base*(1+err);
    const portions=Math.max(n(rec.portions)||1,1),per=total/portions,price=n(rec.price);
    const target=n(rec.target??R.settings?.target)/100,opex=n(rec.opex??R.settings?.opex??0)/100;
    const opexAmt=price*opex,gross=price-per,net=gross-opexAmt,margin=price>0?net/price:0;
    const foodCost=price>0?per/price:0;
    lines.forEach(l=>l.share=base>0?l.cost/base:0);
    const missing=lines.filter(l=>!l.ing||(!l.subrecipe&&!(n(l.ing.price)>0))).map(l=>l.ing?.name||'Ingrediente eliminado');
    const den=1-target-opex;
    return {lines,base,err,total,portions,perPortion:per,price,margin,foodCost,opex,opexAmt,net,netTotal:net*portions,target,suggested:den>0?per/den:0,missing};
  };
  const catName=(R,id)=>R.categories?.find(c=>c.id===id)?.name||'Sin categoría';
  async function request(payload){
    const token=await getAccessToken?.();
    if(!token)throw new Error('No se encontró una sesión activa de TOQUIN.');
    const response=await fetch(FUNCTION_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json',apikey:FUNCTION_KEY,Authorization:'Bearer '+token},
      body:JSON.stringify(payload)
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'Error al consultar las recetas.');
    return result;
  }
  async function pull(){
    if(!getAccessToken||busy||document.visibilityState==='hidden')return;
    busy=true;
    try{
      data=await request({action:'get'});
      if(selected)selected=(data.recipes||[]).find(r=>r.id===selected.id)||null;
      lastError='';
      const editing=document.activeElement?.id==='trSearch'||document.activeElement?.hasAttribute('data-qty');
      if(!editing){if(root?.dataset.view==='list')renderList();else if(root?.dataset.view==='detail'&&selected)renderDetail();}
      const stamp=$('recipeSyncStamp');if(stamp)stamp.textContent='Sincronizado '+new Date().toLocaleTimeString('es-CO');
    }catch(e){lastError=e.message;const el=$('recipeError');if(el)el.textContent='No se pudo actualizar: '+e.message}
    finally{busy=false}
  }
  function shell(content){
    const app=$('root');app.innerHTML='<style>'+
      '.tr-wrap{max-width:1000px;margin:0 auto;padding:14px;color:#39251c}.tr-top{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.tr-card{background:#fffaf1;border:1px solid #ead9c6;border-radius:16px;padding:15px;margin:12px 0}.tr-muted{color:#907b6d;font-size:13px}.tr-tabs{display:flex;gap:7px;overflow:auto;padding:8px 0}.tr-tab{border:1px solid #ead9c6;border-radius:99px;background:#fffaf1;padding:8px 13px;white-space:nowrap}.tr-tab[aria-selected=true]{background:#39251c;color:white}.tr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px}.tr-kpi{background:#fff3df;border-radius:12px;padding:12px}.tr-kpi small{display:block;color:#907b6d}.tr-kpi b{font-size:18px}.tr-input{padding:10px;border:1px solid #d8c6b4;border-radius:9px;max-width:120px;width:100%}.tr-btn{border:0;border-radius:10px;background:#f47721;color:#fff;padding:10px 14px;font-weight:800}.tr-btn.alt{background:#39251c}.tr-table{width:100%;border-collapse:collapse;min-width:680px}.tr-table th,.tr-table td{padding:10px 8px;border-bottom:1px solid #ead9c6;text-align:left}.tr-scroll{overflow:auto}.tr-row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.tr-error{color:#a22}.tr-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.tr-recipe{width:100%;text-align:left;background:#fffaf1;border:1px solid #ead9c6;border-radius:15px;padding:15px;color:inherit}.tr-recipe h3{margin:0 0 7px}.tr-actions{display:flex;gap:8px;flex-wrap:wrap}@media(max-width:600px){.tr-wrap{padding:10px}.tr-table{font-size:13px}}'+
      '</style><div class="tr-wrap">'+content+'</div>';
    root=$('root');
  }
  function goBack(){selected=null;renderList()}
  function renderList(){
    if(!data)return;
    root.dataset.view='list';
    const R=data, cats=R.categories||[], recs=R.recipes||[];
    const list=recs.filter(r=>(category==='all'||r.cat===category)&&(!query||String(r.name||'').toLowerCase().includes(query.toLowerCase())||catName(R,r.cat).toLowerCase().includes(query.toLowerCase())));
    shell('<div class="tr-top"><div><div class="tr-muted">TOQUÍN · RECETAS COMPARTIDAS</div><h1>Recetas</h1><div class="tr-muted">Datos sincronizados desde Juan Beltran</div></div><button class="tr-btn alt" id="trExit">← Volver a operación</button></div>'+
      '<div class="tr-grid"><div class="tr-kpi"><small>Recetas</small><b>'+recs.length+'</b></div><div class="tr-kpi"><small>Categorías</small><b>'+cats.length+'</b></div><div class="tr-kpi"><small>Materias primas</small><b>'+(R.ingredients||[]).length+'</b></div></div>'+
      '<div class="tr-tabs"><button class="tr-tab" data-cat="all" aria-selected="'+(category==='all')+'">Todas</button>'+cats.map(c=>'<button class="tr-tab" data-cat="'+esc(c.id)+'" aria-selected="'+(category===c.id)+'">'+esc(c.name)+'</button>').join('')+'</div>'+
      '<input class="tr-input" id="trSearch" type="search" placeholder="Buscar receta…" value="'+esc(query)+'" style="max-width:100%;width:100%">'+
      '<div class="tr-list">'+list.map(r=>{const c=calc(r,R);return '<button class="tr-recipe" data-recipe="'+esc(r.id)+'"><h3>'+esc(r.name)+'</h3><div class="tr-muted">'+esc(catName(R,r.cat))+' · '+c.portions+' porciones · '+(r.items||[]).length+' ingredientes</div><div class="tr-grid" style="margin-top:10px"><div class="tr-kpi"><small>Costo/porción</small><b>'+money(c.perPortion)+'</b></div><div class="tr-kpi"><small>Precio</small><b>'+money(c.price)+'</b></div><div class="tr-kpi"><small>Food cost</small><b>'+pct(c.foodCost)+'</b></div></div></button>'}).join('')+'</div>'+
      '<p class="tr-muted" id="recipeSyncStamp"></p><p class="tr-error" id="recipeError">'+esc(lastError)+'</p>');
    $('trExit').onclick=()=>window.TOQUIN_RETURN_STAFF?.();
    $('trSearch').oninput=e=>{query=e.target.value;renderList();const x=$('trSearch');x.focus();x.setSelectionRange(query.length,query.length)};
    root.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{category=b.dataset.cat;renderList()});
    root.querySelectorAll('[data-recipe]').forEach(b=>b.onclick=()=>{selected=recs.find(r=>r.id===b.dataset.recipe);renderDetail()});
  }
  async function saveQty(recipeId,ingId,value){
    const qty=Number(value);
    if(!Number.isFinite(qty)||qty<0)throw new Error('La cantidad debe ser un número mayor o igual a cero.');
    await request({action:'set_qty',recipe_id:recipeId,ing_id:ingId,qty});
    await pull();
  }
  function renderDetail(){
    if(!data||!selected)return renderList();
    root.dataset.view='detail';
    const R=data,r=selected,c=calc(r,R);
    const rows=c.lines.map((l,i)=>{
      const ing=l.ing||{},qty=l.it.qty??0,unit=ing.unit||'';
      return '<tr><td><b>'+esc(ing.name||'Ingrediente eliminado')+'</b>'+(l.subrecipe?'<div class="tr-muted">Subreceta</div>':'')+'</td>'+
        '<td><input class="tr-input" inputmode="decimal" type="number" min="0" step="any" data-qty="'+i+'" value="'+esc(qty)+'" style="width:105px"></td>'+
        '<td>'+esc(unit)+'</td><td>'+money(l.uc)+'</td><td><b>'+money(l.cost)+'</b></td><td>'+pct(l.share)+'</td></tr>';
    }).join('');
    shell('<div class="tr-top"><div><button class="tr-btn alt" id="trBack">← Recetas</button><h1>'+esc(r.name)+'</h1><div class="tr-muted">'+esc(catName(R,r.cat))+' · '+c.portions+' porciones</div></div><div class="tr-actions"><button class="tr-btn" id="trExport">Exportar imagen PNG</button></div></div>'+
      '<div class="tr-grid"><div class="tr-kpi"><small>Costo ingredientes</small><b>'+money(c.base)+'</b></div><div class="tr-kpi"><small>Margen de error</small><b>'+pct(c.err)+'</b></div><div class="tr-kpi"><small>Costo total con error</small><b>'+money(c.total)+'</b></div><div class="tr-kpi"><small>Costo por porción</small><b>'+money(c.perPortion)+'</b></div><div class="tr-kpi"><small>Precio de venta</small><b>'+money(c.price)+'</b></div><div class="tr-kpi"><small>Food cost</small><b>'+pct(c.foodCost)+'</b></div><div class="tr-kpi"><small>Margen de ganancia</small><b>'+pct(c.margin)+'</b></div><div class="tr-kpi"><small>Ganancia por porción</small><b>'+money(c.net)+'</b></div><div class="tr-kpi"><small>Precio sugerido</small><b>'+money(c.suggested)+'</b></div></div>'+
      '<div class="tr-card"><div class="tr-row"><h2>Ingredientes</h2><span class="tr-muted">Solo puedes modificar cantidades. Se guardan en la nube.</span></div><div class="tr-scroll"><table class="tr-table"><thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Unidad</th><th>Costo/unidad</th><th>Costo ingrediente</th><th>% participación</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="tr-muted">Precio por empaque, rendimiento, nombres, categorías y estructura de la receta son de solo lectura.</p></div>'+
      '<p class="tr-muted" id="recipeSyncStamp"></p><p class="tr-error" id="recipeError">'+esc(lastError)+'</p>');
    $('trBack').onclick=goBack;
    $('trExport').onclick=()=>exportPng(r,R);
    root.querySelectorAll('[data-qty]').forEach(input=>{
      input.addEventListener('change',async()=>{
        const line=c.lines[Number(input.dataset.qty)];
        input.disabled=true;
        try{await saveQty(r.id,line.it.ing,input.value);lastError='Cantidad actualizada.';renderDetail()}
        catch(e){lastError=e.message;input.disabled=false;const msg=$('recipeError');if(msg)msg.textContent=e.message}
      });
    });
  }
  async function exportPng(r,R){
    if(document.fonts?.ready)await document.fonts.ready;
    const lines=(r.items||[]).map(it=>{
      const ing=(R.ingredients||[]).find(x=>x.id===it.ing),sub=!ing?recipeById(R,it.ing):null;
      let qty=n(it.qty),unit=ing?.unit||(sub?(sub.portionUnit||'porción'):'');
      if(unit.toLowerCase()==='ml'){qty=qty/30;unit='oz'}
      return {name:ing?.name||sub?.name||'Ingrediente eliminado',amount:it.top?'Top':it.show?it.show:(qty.toFixed(2).replace(/\.00$/,'')+' '+unit).trim()};
    });
    const w=1200,pad=78,rowH=88,headH=270,foot=64,h=headH+lines.length*rowH+foot,canvas=document.createElement('canvas');
    canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
    const accent='#f47721',ink='#fff3df';
    let logo=await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src='./logo-toquin.jpg'});
    const contain=(im,x,y,mw,mh)=>{if(!im)return;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,s=Math.min(mw/iw,mh/ih),dw=iw*s,dh=ih*s;c.drawImage(im,x+(mw-dw)/2,y+(mh-dh)/2,dw,dh)};
    c.fillStyle='#FBF8F2';c.fillRect(0,0,w,h);c.fillStyle=accent;c.fillRect(0,0,w,238);c.fillRect(0,0,22,h);
    if(logo){c.fillStyle='rgba(255,255,255,.94)';c.beginPath();c.roundRect(pad,42,150,150,24);c.fill();contain(logo,pad+12,54,126,126)}
    const titleX=logo?pad+188:pad;c.fillStyle=ink;c.font='700 50px sans-serif';c.fillText(r.name||'Receta',titleX,103,w-titleX-pad);c.font='700 23px sans-serif';c.fillText('TOQUÍN',titleX,151,w-titleX-pad);
    c.fillStyle=accent;c.fillRect(pad,238,w-pad*2,8);
    c.save();c.globalAlpha=.055;if(logo)contain(logo,w/2-190,headH+(lines.length*rowH)/2-190,380,380);c.restore();
    const startY=headH+20;c.font='800 22px sans-serif';c.fillStyle=accent;c.fillText('INGREDIENTE',pad,startY);c.textAlign='right';c.fillText('CANTIDAD',w-pad,startY);c.textAlign='left';
    c.font='500 29px sans-serif';c.fillStyle='#0E0E0C';lines.forEach((line,i)=>{const y=startY+54+i*rowH;c.fillText(line.name,pad,y,w-pad*2-220);c.textAlign='right';c.fillText(line.amount,w-pad,y);c.textAlign='left';c.strokeStyle='rgba(23,60,50,.18)';c.lineWidth=2;c.beginPath();c.moveTo(pad,y+24);c.lineTo(w-pad,y+24);c.stroke()});
    c.fillStyle=accent;c.fillRect(22,h-foot,w-22,foot);if(logo){c.save();c.globalAlpha=.92;contain(logo,pad,h-foot+7,50,50);c.restore()}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('No se pudo generar la imagen.');
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(r.name||'receta').replace(/[\\/:*?"<>|]/g,'')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function init(opts={}){
    role=opts.role||'';
    getAccessToken=opts.getAccessToken;
    if(!['admin','toquijefa'].includes(role))return false;
    if(typeof getAccessToken!=='function'){lastError='No hay una sesión activa de TOQUIN.';return false;}
    try{await pull();clearInterval(timer);timer=setInterval(pull,4000);return !!data}
    catch(e){lastError=e.message;data=null;return false}
  }
  window.TOQUIN_RECIPES={
    init,logout:async()=>{clearInterval(timer);data=null;selected=null;getAccessToken=null;},
    open:()=>{if(data)renderList();else alert(lastError||'Recetas no disponibles.')}
  };
})();
