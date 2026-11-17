/* TOQUIN APP · Supabase auth, shared-state storage, orders and administrator UI. */
(() => {
  const cfg = window.TOQUIN_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabasePublishableKey || !window.supabase) return;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const root = document.getElementById('root');
  const roles = { admin: 'JuanChef · Administrador', toquijefa: 'Toquijefa', toquijefe: 'Toquijefe', tachu: 'Tachu' };
  const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let user = null, profile = null, live = null;
  const recipeAccessToken = async () => { const {data,error}=await client.auth.getSession(); if(error)throw error; return data.session?.access_token || null; };
  function box(s){return '<div class="panel">'+s+'</div>';}
  function login(message=''){
    root.innerHTML=box('<h1>Iniciar sesión</h1><p class="muted">Acceso del equipo TOQUÍN</p><label class="field">Usuario<input id="loginName" autocomplete="username"></label><label class="field">Contraseña<input id="loginPassword" type="password" autocomplete="current-password"></label><label class="item"><input id="rememberLogin" type="checkbox" checked><span>Recordar en este celular</span></label><button class="btn" id="loginButton">Entrar</button><p id="loginMessage" class="hint">'+h(message)+'</p>');
    document.getElementById('loginButton').onclick=async()=>{
      const name=document.getElementById('loginName').value.trim().toLowerCase(),password=document.getElementById('loginPassword').value;
      if(!/^[a-z0-9._-]{3,32}$/.test(name)||!password)return login('Usuario o contraseña incompletos.');
      try{
        if(!document.getElementById('rememberLogin').checked){
          await client.auth.setSession({access_token:'',refresh_token:''}).catch(()=>{});
          client.auth.stopAutoRefresh?.();
        }
        const {error}=await client.auth.signInWithPassword({email:name+'@toquin.app',password});
        if(error)throw error;
        await start({username:name,password});
      }catch(e){login(e.message||'No se pudo iniciar sesión.');}
    };
  }
  async function start(credentials){
    const {data:{session}}=await client.auth.getSession();
    user=session?.user||null;
    if(!user){profile=null;return login();}
    const {data,error}=await client.from('profiles').select('id,username,display_name,role').eq('id',user.id).single();
    if(error||!data){await client.auth.signOut();user=null;return login('Perfil sin configurar. Contacta a JuanChef.');}
    profile=data;
    if(['admin','toquijefa'].includes(profile.role)){
      if(window.TOQUIN_RECIPES) await window.TOQUIN_RECIPES.init({role:profile.role,getAccessToken:recipeAccessToken});
      window.TOQUIN_RETURN_STAFF=opsHome;
      return opsHome();
    }
    if(profile.role==='toquijefe')return ordersHome(false);
    if(profile.role==='tachu')return ordersHome(true);
    await client.auth.signOut();login('Rol no autorizado.');
  }
  function header(){
    return '<div class="row"><b>'+h(profile.display_name)+' · '+h(roles[profile.role])+'</b><div><button class="btn secondary" id="changePassword">Cambiar contraseña</button> <button class="btn danger" id="logout">Cerrar sesión</button></div></div><div id="profileBox"></div>';
  }
  function bindHeader(){
    document.getElementById('logout')?.addEventListener('click',async()=>{if(live)await client.removeChannel(live);await window.TOQUIN_RECIPES?.logout?.();await client.auth.signOut();user=null;profile=null;login();});
    document.getElementById('changePassword')?.addEventListener('click',()=>{
      const el=document.getElementById('profileBox');
      el.innerHTML=box('<label class="field">Nueva contraseña<input id="nextPassword" type="password" minlength="10"></label><button class="btn" id="savePassword">Guardar</button><p class="hint" id="passwordMessage"></p>');
      document.getElementById('savePassword').onclick=async()=>{
        const password=document.getElementById('nextPassword').value;
        if(password.length<10)return document.getElementById('passwordMessage').textContent='Usa al menos 10 caracteres.';
        const {error}=await client.auth.updateUser({password});
        document.getElementById('passwordMessage').textContent=error?.message||'Contraseña actualizada.';
      };
    });
  }
  async function adminRequest(payload){
    const {data:{session}}=await client.auth.getSession();
    const response=await fetch(cfg.supabaseUrl+'/functions/v1/admin-users',{
      method:'POST',
      headers:{'Content-Type':'application/json',apikey:cfg.supabasePublishableKey,Authorization:'Bearer '+session.access_token},
      body:JSON.stringify(payload)
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Error de administración');
    return result;
  }
  function usersPanel(){
    return box('<h2>Usuarios</h2><label class="field">Usuario<input id="createUsername"></label><label class="field">Nombre visible<input id="createDisplay"></label><label class="field">Rol<select id="createRole">'+Object.entries(roles).map(([r,n])=>'<option value="'+r+'">'+h(n)+'</option>').join('')+'</select></label><label class="field">Contraseña inicial<input id="createPassword" type="password" minlength="10"></label><button class="btn" id="createAccount">Crear usuario</button><p id="userFeedback" class="hint"></p><div id="userRows"></div>');
  }
  async function loadUsers(){
    const el=document.getElementById('userRows');if(!el)return;
    const {data,error}=await client.from('profiles').select('id,username,display_name,role').order('created_at');
    if(error){el.textContent=error.message;return;}
    el.innerHTML=(data||[]).map(p=>'<div class="item"><span style="flex:1"><b>'+h(p.display_name)+'</b> · '+h(p.username)+' · '+h(roles[p.role])+'</span><button class="btn secondary" data-reset="'+p.id+'">Restablecer</button>'+(p.id!==user.id?'<button class="btn danger" data-delete="'+p.id+'">Eliminar</button>':'')+'</div>').join('');
    el.querySelectorAll('[data-reset]').forEach(b=>b.onclick=async()=>{
      const password=prompt('Nueva contraseña (mínimo 10 caracteres):');if(!password)return;
      try{await adminRequest({action:'reset',user_id:b.dataset.reset,password});alert('Contraseña restablecida. Entrégala por un canal privado.');}
      catch(e){alert(e.message);}
    });
    el.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
      if(!confirm('¿Eliminar este usuario?'))return;
      try{await adminRequest({action:'delete',user_id:b.dataset.delete});loadUsers();}
      catch(e){alert(e.message);}
    });
  }
  function listenSync(){
    if(window.__toqSync)return;window.__toqSync=true;
    window.addEventListener('toquin-state-changed', async event => { try { await client.from('app_state').upsert({id:'main',data:event.detail,updated_by:user.id,updated_at:new Date().toISOString()}); } catch(e) { console.warn('sync failed',e); } });
  }
  async function opsHome(){
    const {data}=await client.from('app_state').select('data,updated_at').eq('id','main').maybeSingle();
    if(data?.data&&window.TOQUIN_LEGACY)window.TOQUIN_LEGACY.setState(data.data);
    listenSync();
    window.home=()=>staffHome();
    window.TOQUIN_ACCOUNT_BAR=()=>'<span class="muted">'+h(profile.display_name)+'</span><span><button class="btn secondary" onclick="toqPass()">Contraseña</button> '+(profile.role==='admin'?'<button class="btn secondary" onclick="toqUsers()">Usuarios</button> ':'')+'<button class="btn danger" onclick="toqLogout()">Salir</button></span>';
    window.toqLogout=async()=>{if(live)await client.removeChannel(live);await window.TOQUIN_RECIPES?.logout?.();await client.auth.signOut();user=null;profile=null;window.TOQUIN_ACCOUNT_BAR=null;login();};
    window.toqUsers=()=>staffHome();
    window.toqPass=()=>{
      root.innerHTML=box('<h2>Cambiar contraseña</h2><label class="field">Nueva contraseña<input id="nextPassword" type="password" minlength="10"></label><button class="btn" id="savePassword">Guardar</button> <button class="btn secondary" id="backOps">← Volver</button><p class="hint" id="passwordMessage"></p>');
      document.getElementById('backOps').onclick=()=>window.enter('camila');
      document.getElementById('savePassword').onclick=async()=>{
        const password=document.getElementById('nextPassword').value;
        if(password.length<10)return document.getElementById('passwordMessage').textContent='Usa al menos 10 caracteres.';
        const {error}=await client.auth.updateUser({password});
        document.getElementById('passwordMessage').textContent=error?.message||'Contraseña actualizada.';
      };
    };
    window.enter('camila');
  }
  async function staffHome(){
    const {data,error}=await client.from('app_state').select('data,updated_at').eq('id','main').maybeSingle();
    if(data?.data && window.TOQUIN_LEGACY) window.TOQUIN_LEGACY.setState(data.data);
    listenSync();
    root.innerHTML=header()+'<h1>Operación TOQUÍN</h1>'+box('<p>Horario, turnos, tarifas y nómina compartidos entre dispositivos.</p><button class="btn" id="openOps">Abrir horario y nómina</button> <button class="btn secondary" id="openRecipes">Recetas</button><p id="syncInfo" class="hint">'+(error?'Sin conexión de datos: '+h(error.message):'Última actualización: '+h(data?.updated_at||'Aún sin datos'))+'</p>')+(profile.role==='admin'?usersPanel():'');
    bindHeader();
    document.getElementById('openRecipes').onclick=()=>window.TOQUIN_RECIPES?.open();
    document.getElementById('openOps').onclick=()=>{if(window.TOQUIN_LEGACY)window.TOQUIN_LEGACY.setState(data?.data||{});window.home=()=>staffHome();window.enter('camila');};
    if(profile.role==='admin'){
      document.getElementById('createAccount').onclick=async()=>{
        const username=document.getElementById('createUsername').value.trim().toLowerCase();
        const display_name=document.getElementById('createDisplay').value.trim();
        const role=document.getElementById('createRole').value;
        const password=document.getElementById('createPassword').value;
        try{await adminRequest({action:'create',username,display_name,role,password});document.getElementById('userFeedback').textContent='Cuenta creada.';loadUsers();}
        catch(e){document.getElementById('userFeedback').textContent=e.message;}
      };
      loadUsers();
    }
  }
  async function loadInventory(){
    const {data,error}=await client.from('inventory').select('id,name').eq('active',true).order('name');
    if(error)throw error;
    return data||[];
  }
  async function ordersHome(isRequester,tab){
    if(tab)ordersTab=tab;
    const tabs=isRequester?[['pedido','Pedido'],['inventario','Inventario'],['historial','Mis pedidos']]:[['pedidos','Pedidos'],['inventario','Inventario']];
    if(!tabs.some(t=>t[0]===ordersTab))ordersTab=tabs[0][0];
    root.innerHTML=header()+'<div class="tabs">'+tabs.map(([k,l])=>'<button class="tab '+(k===ordersTab?'active':'')+'" data-otab="'+k+'">'+l+'</button>').join('')+'</div><div id="ordersBody"><p class="muted">Cargando…</p></div>';
    bindHeader();
    root.querySelectorAll('[data-otab]').forEach(b=>b.onclick=()=>ordersHome(isRequester,b.dataset.otab));
    const body=document.getElementById('ordersBody');
    try{
      if(ordersTab==='pedido')await tachuOrder(body);
      else if(ordersTab==='inventario')await (isRequester?tachuInventory(body):viewInventory(body));
      else if(ordersTab==='historial')await orderHistory(body);
      else await buyerOrders(body);
    }catch(e){body.innerHTML=box(h(e.message||String(e)));}
    watchOrders(isRequester);
  }
  async function tachuOrder(body){
    const inventory=await loadInventory();
    const sel={},extras=[];
    body.innerHTML='<h1>Pedido de materia prima</h1><p class="muted">Marca lo que hay que pedir y anota cuánto te queda de ese producto.</p><input id="orderSearch" placeholder="Buscar producto" style="margin:8px 0"><p class="hint" id="orderCount"></p><div id="orderList"></div>'+
      box('<h2>Producto nuevo</h2><p class="hint">Si no está en la lista.</p><div class="row" style="flex-wrap:nowrap"><input id="newName" placeholder="Nombre" style="flex:2"><input id="newHave" placeholder="Tengo" style="flex:1"><button class="btn secondary" id="addNew">Agregar</button></div><div id="newList"></div>')+
      '<label class="field">Nota general<textarea id="orderGeneralNote" placeholder="Opcional"></textarea></label><button class="btn" id="submitOrder" style="width:100%;padding:14px">Enviar pedido a Toquijefe</button>';
    const count=()=>{document.getElementById('orderCount').textContent=(Object.keys(sel).length+extras.length)+' productos marcados';};
    const paint=()=>{
      const q=(document.getElementById('orderSearch').value||'').toLowerCase();
      document.getElementById('orderList').innerHTML=inventory.filter(x=>!q||x.name.toLowerCase().includes(q)).map(x=>{const s=sel[x.id];return '<div class="item'+(s?' picked':'')+'"><label style="display:flex;gap:10px;align-items:center;flex:1;cursor:pointer"><input type="checkbox" data-pick="'+x.id+'" '+(s?'checked':'')+'><span>'+h(x.name)+'</span></label>'+(s?'<input data-have="'+x.id+'" placeholder="Tengo…" value="'+h(s.have)+'">':'')+'</div>';}).join('');
      count();
      root.querySelectorAll('[data-pick]').forEach(c=>c.onchange=()=>{const x=inventory.find(i=>i.id===c.dataset.pick);if(c.checked)sel[x.id]={name:x.name,have:''};else delete sel[x.id];paint();if(c.checked)document.querySelector('[data-have="'+x.id+'"]')?.focus();});
      root.querySelectorAll('[data-have]').forEach(i=>i.oninput=()=>{sel[i.dataset.have].have=i.value;});
    };
    const paintNew=()=>{document.getElementById('newList').innerHTML=extras.map((x,i)=>'<div class="item picked"><span style="flex:1">'+h(x.name)+'<div class="hint">Tengo: '+h(x.have||'—')+'</div></span><button class="btn danger" data-xnew="'+i+'">×</button></div>').join('');root.querySelectorAll('[data-xnew]').forEach(b=>b.onclick=()=>{extras.splice(+b.dataset.xnew,1);paintNew();count();});};
    document.getElementById('orderSearch').oninput=paint;
    document.getElementById('addNew').onclick=()=>{const n=document.getElementById('newName').value.trim();if(!n)return;extras.push({name:n,have:document.getElementById('newHave').value.trim()});document.getElementById('newName').value='';document.getElementById('newHave').value='';paintNew();count();};
    document.getElementById('submitOrder').onclick=async()=>{
      const items=[...Object.entries(sel).map(([id,s])=>({inventory_id:id,name:s.name,have:s.have})),...extras.map(x=>({inventory_id:null,name:x.name,have:x.have}))];
      if(!items.length)return alert('Marca al menos un producto.');
      const btn=document.getElementById('submitOrder');btn.disabled=true;btn.textContent='Enviando…';
      const {data:order,error}=await client.from('purchase_orders').insert({created_by:user.id,general_note:document.getElementById('orderGeneralNote').value}).select().single();
      if(error){btn.disabled=false;btn.textContent='Enviar pedido a Toquijefe';return alert(error.message);}
      const res=await client.from('purchase_order_items').insert(items.map(x=>({order_id:order.id,inventory_id:x.inventory_id,product_name:x.name,quantity_requested:'',on_hand:x.have||'',tachu_note:''})));
      if(res.error){btn.disabled=false;btn.textContent='Enviar pedido a Toquijefe';return alert(res.error.message);}
      alert('Pedido enviado a Toquijefe.');ordersHome(true,'historial');
    };
    paint();
  }
  async function fetchOrders(){
    const {data,error}=await client.from('purchase_orders').select('*,purchase_order_items(*)').order('created_at',{ascending:false}).limit(60);
    if(error)throw error;
    const ids=data.flatMap(o=>o.purchase_order_items.map(i=>i.id));
    let notes=[];
    if(ids.length){const r=await client.from('order_item_notes').select('order_item_id,author_role,note,created_at').in('order_item_id',ids).order('created_at');notes=r.data||[];}
    data.forEach(o=>{o.purchase_order_items.sort((a,b)=>String(a.product_name).localeCompare(String(b.product_name),'es'));o.purchase_order_items.forEach(i=>i.notes=notes.filter(n=>n.order_item_id===i.id));});
    return data;
  }
  function itemRow(i,canBuy){
    const st=i.status||'Pendiente';
    const notes=(i.notes||[]).map(n=>'<div class="hint">💬 '+(n.author_role==='tachu'?'Tachu':'Toquijefe')+': '+h(n.note)+'</div>').join('');
    return '<div class="item order-item'+(st==='Comprado'?' bought':st==='No comprado'?' missing':'')+'"><div style="flex:1;min-width:0"><b>'+h(i.product_name)+'</b><div class="hint">Tachu tiene: '+h(i.on_hand||'—')+'</div>'+notes+'</div>'+
      (canBuy?'<button class="btn '+(st==='Comprado'?'':'secondary')+'" data-buy="'+i.id+'">'+(st==='Comprado'?'✓ Comprado':'Comprado')+'</button><button class="btn '+(st==='No comprado'?'danger':'secondary')+'" data-miss="'+i.id+'" title="No lo conseguí">✕</button>':'<span class="badge">'+h(st)+'</span>')+
      '<button class="btn secondary" data-note="'+i.id+'" title="Agregar nota">💬</button></div>';
  }
  function orderCard(o,canBuy,open){
    const items=o.purchase_order_items,done=items.filter(i=>i.status==='Comprado').length;
    const when=new Date(o.created_at).toLocaleString('es-CO',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    return '<section class="panel" data-card="'+o.id+'"><div class="row"><div><b>Pedido · '+when+'</b><div class="hint">'+h(o.status)+' · '+done+' de '+items.length+' comprados</div></div>'+(open?'':'<button class="btn secondary" data-open="'+o.id+'">Ver</button>')+'</div>'+
      (o.general_note?'<p class="hint">Nota: '+h(o.general_note)+'</p>':'')+
      (open?items.map(i=>itemRow(i,canBuy)).join('')+(canBuy?'<button class="btn" data-reply="'+o.id+'" style="width:100%;padding:14px;margin-top:8px">Enviar a Tachu</button>':''):'')+'</section>';
  }
  async function buyerOrders(body){
    const orders=await fetchOrders();
    const pending=orders.filter(o=>o.status!=='Respondido'),done=orders.filter(o=>o.status==='Respondido');
    body.innerHTML='<h1>Pedidos de Tachu</h1>'+(pending.length?pending.map(o=>orderCard(o,true,true)).join(''):box('<p class="muted">No hay pedidos pendientes.</p>'))+(done.length?'<h2>Ya respondidos</h2>'+done.map(o=>orderCard(o,false,false)).join(''):'');
    bindOrderButtons(body,orders,()=>buyerOrders(body));
  }
  async function orderHistory(body){
    const orders=await fetchOrders();
    body.innerHTML='<h1>Mis pedidos</h1>'+(orders.length?orders.map((o,k)=>orderCard(o,false,k===0)).join(''):box('<p class="muted">Aún no has enviado pedidos.</p>'));
    bindOrderButtons(body,orders,()=>orderHistory(body));
  }
  function bindOrderButtons(body,orders,refresh){
    body.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{const o=orders.find(x=>x.id===b.dataset.open);b.closest('section').outerHTML=orderCard(o,false,true);bindOrderButtons(body,orders,refresh);});
    body.querySelectorAll('[data-buy],[data-miss]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.buy||b.dataset.miss,item=orders.flatMap(o=>o.purchase_order_items).find(i=>i.id===id);
      const target=b.dataset.buy?(item.status==='Comprado'?'Pendiente':'Comprado'):(item.status==='No comprado'?'Pendiente':'No comprado');
      b.disabled=true;
      const {error}=await client.from('purchase_order_items').update({status:target}).eq('id',id);
      if(error){b.disabled=false;return alert(error.message);}
      const o=orders.find(x=>x.purchase_order_items.includes(item));
      if(o&&o.status==='Enviado')await client.from('purchase_orders').update({status:'En compra'}).eq('id',o.id);
      refresh();
    });
    body.querySelectorAll('[data-note]').forEach(b=>b.onclick=async()=>{
      const note=prompt('Nota para este producto');if(!note||!note.trim())return;
      const {error}=await client.from('order_item_notes').insert({order_item_id:b.dataset.note,author_id:user.id,author_role:profile.role,note:note.trim()});
      if(error)return alert(error.message);refresh();
    });
    body.querySelectorAll('[data-reply]').forEach(b=>b.onclick=async()=>{
      const {error}=await client.from('purchase_orders').update({status:'Respondido',replied_at:new Date().toISOString()}).eq('id',b.dataset.reply);
      if(error)return alert(error.message);alert('Respuesta enviada a Tachu.');refresh();
    });
  }
  async function tachuInventory(body){
    const inventory=await loadInventory();
    const {data:last}=await client.from('inventory_counts').select('*').order('created_at',{ascending:false}).limit(1).maybeSingle();
    const prev={};(last?.items||[]).forEach(x=>prev[x.name]=x.qty);
    const counts={};
    body.innerHTML='<h1>Inventario</h1><p class="muted">Anota cuánto hay de cada producto. Deja vacío lo que no contaste.</p>'+(last?'<p class="hint">Último inventario enviado: '+new Date(last.created_at).toLocaleString('es-CO')+'</p>':'')+'<input id="invSearch" placeholder="Buscar producto" style="margin:8px 0"><div id="invList"></div><label class="field">Nota<textarea id="invNote" placeholder="Opcional"></textarea></label><button class="btn" id="saveInv" style="width:100%;padding:14px">Enviar inventario a Toquijefe</button>';
    const paint=()=>{const q=document.getElementById('invSearch').value.toLowerCase();document.getElementById('invList').innerHTML=inventory.filter(x=>!q||x.name.toLowerCase().includes(q)).map(x=>'<div class="item'+((counts[x.id]||'').trim()?' picked':'')+'"><span style="flex:1">'+h(x.name)+(prev[x.name]?'<div class="hint">Antes: '+h(prev[x.name])+'</div>':'')+'</span><input data-inv="'+x.id+'" placeholder="Cantidad" value="'+h(counts[x.id]||'')+'"></div>').join('');root.querySelectorAll('[data-inv]').forEach(i=>i.oninput=()=>{counts[i.dataset.inv]=i.value;i.closest('.item').classList.toggle('picked',!!i.value.trim());});};
    document.getElementById('invSearch').oninput=paint;paint();
    document.getElementById('saveInv').onclick=async()=>{
      const items=inventory.filter(x=>(counts[x.id]||'').trim()).map(x=>({inventory_id:x.id,name:x.name,qty:counts[x.id].trim()}));
      if(!items.length)return alert('Anota al menos un producto.');
      const {error}=await client.from('inventory_counts').insert({created_by:user.id,items,note:document.getElementById('invNote').value});
      if(error)return alert(error.message);alert('Inventario enviado.');ordersHome(true,'inventario');
    };
  }
  async function viewInventory(body){
    const {data,error}=await client.from('inventory_counts').select('*').order('created_at',{ascending:false}).limit(10);
    if(error)throw error;
    const cur=data?.[0];
    body.innerHTML='<h1>Inventario de Tachu</h1>'+(cur?'<p class="hint">Contado el '+new Date(cur.created_at).toLocaleString('es-CO')+' · '+cur.items.length+' productos</p>'+(cur.note?'<p class="hint">Nota: '+h(cur.note)+'</p>':'')+'<input id="invSearch" placeholder="Buscar producto" style="margin:8px 0"><div id="invList"></div>'+(data.length>1?'<h2>Inventarios anteriores</h2>'+data.slice(1).map(c=>'<div class="item"><span style="flex:1">'+new Date(c.created_at).toLocaleString('es-CO')+'</span><span class="hint">'+c.items.length+' productos</span></div>').join(''):''):box('<p class="muted">Tachu todavía no ha enviado inventario.</p>'));
    if(cur){const paint=()=>{const q=document.getElementById('invSearch').value.toLowerCase();document.getElementById('invList').innerHTML=cur.items.filter(x=>!q||x.name.toLowerCase().includes(q)).map(x=>'<div class="item"><span style="flex:1">'+h(x.name)+'</span><b>'+h(x.qty)+'</b></div>').join('');};document.getElementById('invSearch').oninput=paint;paint();}
  }
  function watchOrders(isRequester){
    if(live)client.removeChannel(live);
    const again=()=>{const a=document.activeElement;if(a&&/INPUT|TEXTAREA/.test(a.tagName))return;if(!isRequester&&ordersTab==='pedidos')ordersHome(false);else if(isRequester&&ordersTab==='historial')ordersHome(true);};
    live=client.channel('toquin-orders-'+user.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'purchase_orders'},again)
      .on('postgres_changes',{event:'*',schema:'public',table:'purchase_order_items'},again)
      .subscribe();
  }
  let ordersTab='pedido';
  client.auth.onAuthStateChange((_event,session)=>{if(!session&&user){user=null;profile=null;login();}});
  start();
})();
