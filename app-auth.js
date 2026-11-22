/* TOQUIN APP · Supabase auth, shared-state storage, orders and administrator UI. */
(() => {
  const cfg = window.TOQUIN_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabasePublishableKey || !window.supabase) return;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const root = document.getElementById('root');
  const roles = { admin: 'JuanChef · Administrador', toquijefa: 'Toquijefa', toquijefe: 'Toquijefe', tachu: 'Tachu', produccion: 'Producción' };
  const h = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let user = null, profile = null, live = null;
  const recipeAccessToken = async () => { const {data,error}=await client.auth.getSession(); if(error)throw error; return data.session?.access_token || null; };
  function box(s){return '<div class="panel">'+s+'</div>';}
  function login(message=''){
    root.innerHTML=box('<h1>Iniciar sesión</h1><p class="muted">Acceso del equipo TOQUÍN</p><label class="field">Usuario<input id="loginName" autocomplete="username"></label><label class="field">Contraseña<input id="loginPassword" type="password" autocomplete="current-password"></label><label class="item"><input id="rememberLogin" type="checkbox" checked><span>Recordar en este celular</span></label><button class="btn" id="loginButton">Entrar</button><p id="loginMessage" class="hint">'+h(message)+'</p>');
    document.getElementById('loginButton').onclick=async()=>{
      const name=document.getElementById('loginName').value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,''),password=document.getElementById('loginPassword').value;
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
    if(canSeeReports()){refreshProdBadge();watchProduction();}
    if(['admin','toquijefa'].includes(profile.role)){
      if(window.TOQUIN_RECIPES) await window.TOQUIN_RECIPES.init({role:profile.role,getAccessToken:recipeAccessToken});
      window.TOQUIN_RETURN_STAFF=opsHome;
      return opsHome();
    }
    if(profile.role==='toquijefe')return ordersHome(false);
    if(profile.role==='tachu')return ordersHome(true);
    if(profile.role==='produccion')return productionHome();
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
    const tabs=isRequester?[['pedido','Pedido'],['inventario','Inventario'],['historial','Mis pedidos']]:[['pedidos','Pedidos'],['inventario','Inventario'],['produccion','Producción<span data-prod-badge>'+(prodUnread?' ('+prodUnread+')':'')+'</span>']];
    if(!tabs.some(t=>t[0]===ordersTab))ordersTab=tabs[0][0];
    root.innerHTML=header()+'<div class="tabs">'+tabs.map(([k,l])=>'<button class="tab '+(k===ordersTab?'active':'')+'" data-otab="'+k+'">'+l+'</button>').join('')+'</div><div id="ordersBody"><p class="muted">Cargando…</p></div>';
    bindHeader();
    root.querySelectorAll('[data-otab]').forEach(b=>b.onclick=()=>ordersHome(isRequester,b.dataset.otab));
    const body=document.getElementById('ordersBody');
    try{
      if(ordersTab==='pedido')await tachuOrder(body);
      else if(ordersTab==='inventario')await (isRequester?tachuInventory(body):viewInventory(body));
      else if(ordersTab==='historial')await orderHistory(body);
      else if(ordersTab==='produccion')await productionReports(body);
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
  // ---------------- Producción (Pipa) ----------------
  const PROD_SECTIONS=[
    {k:'res',title:'Carne',icon:'🥩',type:'meat'},
    {k:'pollo',title:'Pollo',icon:'🍗',type:'meat',only1:true},
    {k:'burger',title:'Carne de burger',icon:'🍔',type:'burger'},
    {k:'lomo',title:'Lomo',icon:'🍖',type:'clean'}
  ];
  const P1=80,P2=160,PACK=480;
  const pnum=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};
  const gr=v=>(Math.round(v*10)/10).toLocaleString('es-CO')+' g';
  const kgs=v=>(v/1000).toLocaleString('es-CO',{maximumFractionDigits:3})+' kg';
  const ppct=v=>(Number.isFinite(v)?(v*100).toFixed(1).replace('.',','):'0')+'%';
  const nf=v=>(Math.round(v*10)/10).toLocaleString('es-CO');
  const canProduce=()=>['admin','produccion'].includes(profile?.role);
  const canSeeReports=()=>['admin','toquijefa','toquijefe'].includes(profile?.role);
  let prodUnread=0,prodChannel=null;
  (function(){if(document.getElementById('prodCss'))return;const st=document.createElement('style');st.id='prodCss';st.textContent='.thumbs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.thumbs img{width:78px;height:78px;object-fit:cover;border-radius:10px;border:1px solid #ead9c6}.prod-res{border-radius:14px;padding:12px 14px;margin:10px 0;font-weight:700}.prod-res.ok{background:#e9f6e6;border:2px solid #1f7a3a;color:#145228}.prod-res.info{background:#fff6ea;border:2px solid #f47721;color:#7a3a0e}.prod-seg{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}.prod-seg label{flex:1;min-width:140px;display:flex;gap:6px;align-items:center;border:1px solid #ead9c6;border-radius:12px;padding:9px;font-weight:800;background:#fff}.prod-seg input{width:18px;height:18px}.prod-pick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.prod-opt{display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 10px;border:2px solid #ead9c6;border-radius:18px;background:#fff;cursor:pointer;font-size:16px;text-align:center}.prod-opt .ico{font-size:40px;line-height:1}.prod-opt input{width:22px;height:22px}.prod-opt:has(input:checked){border-color:#f47721;background:#fff1dc;box-shadow:0 4px 12px rgba(244,119,33,.2)}.prod-res.bad{background:#fdeceb;border:2px solid #b3261e;color:#8c1d18}.prod-line{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px dashed #ead9c6}.prod-line.total{font-weight:900;border-bottom:0}.photo-btn{display:inline-block;margin:4px 0}.prod-sec h3{margin:14px 0 4px}#prodToast{position:fixed;left:12px;right:12px;bottom:16px;z-index:999;background:#39251c;color:#fff;border-radius:14px;padding:14px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer}';document.head.appendChild(st);})();
  function setBadges(){document.querySelectorAll('[data-prod-badge]').forEach(e=>e.textContent=prodUnread?' ('+prodUnread+')':'');}
  async function refreshProdBadge(){
    if(!canSeeReports())return;
    const {count}=await client.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('kind','production').is('read_at',null);
    prodUnread=count||0;setBadges();
  }
  function watchProduction(){
    if(prodChannel)return;
    prodChannel=client.channel('toquin-prod-'+user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'production_reports'},p=>{
      setTimeout(refreshProdBadge,1200);
      const body=document.getElementById('prodBody');
      if(body&&body.dataset.view==='reports'){productionReports(body);return;}
      document.getElementById('prodToast')?.remove();
      const t=document.createElement('div');t.id='prodToast';t.textContent='📦 Nuevo reporte de producción de '+(p.new?.created_by_name||'Pipa')+' · toca para verlo';
      t.onclick=()=>{t.remove();if(profile.role==='toquijefe')ordersHome(false,'produccion');else openProductionStaff();};
      document.body.appendChild(t);setTimeout(()=>t.remove(),15000);
    }).subscribe();
  }
  async function shrink(file){
    try{const bmp=await createImageBitmap(file);const s=Math.min(1,1400/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.78));return b||file;}
    catch(e){return file;}
  }
  function prodCalc(sec,d){
    d=d||{};
    if(sec.type==='clean'){const rec=pnum(d.llego),merma=pnum(d.merma),fin=pnum(d.final);return {cleanOnly:true,rec,merma,fin,loss:rec-merma-fin,ok:null};}
    if(sec.type==='meat'&&d.mode==='peso'){
      const rec=pnum(d.llego),merma=pnum(d.merma),fin=pnum(d.final),loss=rec-merma-fin;
      return {peso:true,rec,merma,fin,loss,ok:null};
    }
    if(sec.type==='meat'){
      const rec=pnum(d.llego),merma=pnum(d.merma),x1=pnum(d.x1),x2=pnum(d.x2),clean=rec-merma,used=x1*P1+x2*P2,diff=used-clean;
      return {rec,merma,x1,x2,clean,used,diff,ok:(used&&rec)?Math.abs(diff)<=Math.max(clean*0.02,1):null};
    }
    const rec=pnum(d.llego),packs=pnum(d.packs),used=packs*PACK,diff=used-rec;
    return {rec,packs,used,diff,expected:rec/PACK,ok:(packs&&rec)?Math.abs(diff)<=Math.max(rec*0.02,1):null};
  }
  function photoField(k,f,label){
    return '<label class="field">'+label+'<input type="text" inputmode="decimal" autocomplete="off" data-p="'+k+'.'+f+'" placeholder="gramos"></label><label class="btn secondary photo-btn">📷 Foto de evidencia<input type="file" accept="image/*" multiple hidden data-f="'+k+'.'+f+'"></label><div class="thumbs" data-t="'+k+'.'+f+'"></div>';
  }
  function countField(k,f,label){return '<label class="field">'+label+'<input type="text" inputmode="decimal" autocomplete="off" data-p="'+k+'.'+f+'" placeholder="cantidad"></label>';}
  function productionForm(container,onDone,sel){
    if(!sel){
      container.dataset.view='pick';
      container.innerHTML='<h1>Producción de hoy</h1><p class="muted">¿Qué vas a producir hoy? Elige uno o varios.</p><div class="prod-pick">'+PROD_SECTIONS.map(s=>'<label class="prod-opt"><input type="checkbox" value="'+s.k+'"><span class="ico">'+s.icon+'</span><b>'+s.title+'</b></label>').join('')+'</div><button class="btn" id="prodGo" style="width:100%;padding:14px;margin-top:14px">Continuar</button><p class="hint" id="prodPickMsg"></p>';
      document.getElementById('prodGo').onclick=()=>{const v=[...container.querySelectorAll('.prod-opt input:checked')].map(i=>i.value);if(!v.length){document.getElementById('prodPickMsg').textContent='Elige al menos un producto.';return;}productionForm(container,onDone,v);};
      return;
    }
    container.dataset.view='form';
    const files={};
    const kgField=(k,f,l)=>photoField(k,f,l).replace('placeholder="gramos"','placeholder="kilos, ej: 10,5"');
    container.innerHTML='<div class="row"><h1>Producción</h1><button class="btn secondary" id="prodPick">← Cambiar productos</button></div><p class="muted">Nada es obligatorio: llena solo lo que hiciste hoy. Las fotos de evidencia también son opcionales.</p>'+
      PROD_SECTIONS.filter(s=>sel.includes(s.k)).map(s=>box('<h2>'+s.icon+' '+s.title+'</h2>'+
        (s.type==='meat'?'<div class="prod-seg"><label><input type="radio" name="mode-'+s.k+'" value="porciones" checked> 🍽️ Sacó porciones</label><label><input type="radio" name="mode-'+s.k+'" value="peso"> ⚖️ Solo limpió / descongeló</label></div>':'')+
        kgField(s.k,'llego','Lo que llegó (kg)'+(s.type==='meat'?' · congelado si viene así':''))+
        (s.type==='meat'?photoField(s.k,'merma','Merma al limpiar (g)')+
          '<div data-modebox="'+s.k+'-porciones">'+(s.only1?countField(s.k,'x1','Porciones x1 (80 g)'):'<div class="grid">'+countField(s.k,'x1','Porciones x1 (80 g)')+countField(s.k,'x2','Porciones x2 (160 g)')+'</div>')+'</div>'+
          '<div data-modebox="'+s.k+'-peso" hidden>'+kgField(s.k,'final','Peso final limpio / descongelado (kg)')+'</div>'
        :s.type==='clean'?countField(s.k,'merma','Merma al limpiar (g)').replace('placeholder="cantidad"','placeholder="gramos"')+kgField(s.k,'final','Peso total limpio y porcionado (kg)'):countField(s.k,'packs','Paquetes x3 (480 g)')))).join('')+
      '<label class="field">Nota (opcional)<textarea id="prodNote"></textarea></label><button class="btn" id="prodSend" style="width:100%;padding:14px">Enviar reporte</button><p class="hint" id="prodMsg"></p>';
    container.querySelectorAll('[data-f]').forEach(inp=>inp.onchange=()=>{
      const key=inp.dataset.f;files[key]=[...(files[key]||[]),...inp.files];inp.value='';
      const t=container.querySelector('[data-t="'+key+'"]');
      t.innerHTML=files[key].map((f,i)=>'<span style="position:relative"><img src="'+URL.createObjectURL(f)+'"><button class="btn danger" style="position:absolute;top:2px;right:2px;padding:0 7px" data-rm="'+key+'|'+i+'">×</button></span>').join('');
      t.querySelectorAll('[data-rm]').forEach(b=>b.onclick=e=>{e.preventDefault();const [k,i]=b.dataset.rm.split('|');files[k].splice(+i,1);inp.dispatchEvent(new Event('change'));});
    });
    container.querySelectorAll('input[type=radio][name^="mode-"]').forEach(rb=>rb.onchange=()=>{const k=rb.name.slice(5);container.querySelector('[data-modebox="'+k+'-porciones"]').hidden=rb.value!=='porciones';container.querySelector('[data-modebox="'+k+'-peso"]').hidden=rb.value!=='peso';});
    document.getElementById('prodPick').onclick=()=>productionForm(container,onDone);
    const msg=t=>{document.getElementById('prodMsg').textContent=t;};
    document.getElementById('prodSend').onclick=async()=>{
      const val=key=>container.querySelector('[data-p="'+key+'"]')?.value.trim()||'';
      const data={};
      PROD_SECTIONS.forEach(s=>{
        const mode=s.type==='meat'?(container.querySelector('input[name="mode-'+s.k+'"]:checked')?.value||'porciones'):'';
        const fields=s.type==='meat'?(mode==='peso'?['llego','merma','final']:(s.only1?['llego','merma','x1']:['llego','merma','x1','x2'])):s.type==='clean'?['llego','merma','final']:['llego','packs'];
        const d={};fields.forEach(f=>{const v=val(s.k+'.'+f);if(v!=='')d[f]=(f==='llego'||f==='final')?Math.round(pnum(v)*1000):pnum(v);});
        const hasPhotos=fields.some(f=>(files[s.k+'.'+f]||[]).length);
        if(!Object.keys(d).length&&!hasPhotos)return;
        if(mode)d.mode=mode;
        data[s.k]=d;
      });
      if(!Object.keys(data).length)return msg('Llena al menos un producto.');
      const btn=document.getElementById('prodSend');btn.disabled=true;
      try{
        const id=crypto.randomUUID(),photos={};let n=0;
        const total=Object.entries(files).filter(([k])=>data[k.split('.')[0]]).reduce((a,[,v])=>a+v.length,0)||1;
        for(const [key,list] of Object.entries(files)){
          const [sk,fk]=key.split('.');if(!data[sk]||(data[sk].mode==='peso'&&['x1','x2'].includes(fk))||(data[sk].mode==='porciones'&&fk==='final'))continue;
          photos[key]=[];
          for(const f of list){
            n++;btn.textContent='Subiendo fotos '+n+' de '+total+'…';
            const blob=await shrink(f),path=id+'/'+key.replace('.','-')+'-'+n+'.jpg';
            const {error}=await client.storage.from('produccion').upload(path,blob,{contentType:'image/jpeg',upsert:false});
            if(error)throw error;
            photos[key].push(path);
          }
        }
        btn.textContent='Enviando…';
        const {error}=await client.from('production_reports').insert({id,created_by:user.id,created_by_name:profile.display_name||profile.username,note:document.getElementById('prodNote').value.trim(),data,photos});
        if(error)throw error;
        container.innerHTML=box('<h1>✅ Reporte enviado</h1><p>Gracias. El reporte les llegó a JuanChef, Camila y Luisda.</p><button class="btn" id="prodAgain">Hacer otro reporte</button>');
        document.getElementById('prodAgain').onclick=()=>onDone?onDone():productionForm(container);
      }catch(e){btn.disabled=false;btn.textContent='Enviar reporte';msg('No se pudo enviar: '+(e.message||e));}
    };
  }
  function line(l,v,cls){return '<div class="prod-line'+(cls?' '+cls:'')+'"><span>'+l+'</span><b>'+v+'</b></div>';}
  function sectionResult(s,d,r){
    const c=prodCalc(s,d),ph=f=>'<div class="thumbs" data-ph="'+r.id+'|'+s.k+'.'+f+'"></div>',has=f=>d&&d[f]!=null;
    let h='<div class="prod-sec"><h3>'+s.icon+' '+s.title+(c.peso?' · limpieza / descongelado':'')+'</h3>';
    if(c.cleanOnly){
      h+=(has('llego')?line('Llegó',kgs(c.rec)):'')+ph('llego')+(has('merma')?line('Merma al limpiar',gr(c.merma)+(c.rec?' · '+ppct(c.merma/c.rec):'')):'')+ph('merma')+(has('final')?line('Peso total limpio y porcionado',kgs(c.fin),'total'):'')+ph('final');
      if(has('llego')&&has('final')){
        if(has('merma'))h+=line('Diferencia (llegó − merma − peso total)',gr(c.loss)+' · '+ppct(c.rec?c.loss/c.rec:0));
        h+='<div class="prod-res info">⚖️ Rendimiento: de '+kgs(c.rec)+' quedaron '+kgs(c.fin)+' limpios y porcionados ('+ppct(c.rec?c.fin/c.rec:0)+')</div>';
      }else if(has('llego')&&has('merma')&&!has('final'))h+=line('Limpio (llegó − merma)',kgs(Math.max(c.rec-c.merma,0)),'total');
      return h+'</div>';
    }
    if(c.peso){
      h+=(has('llego')?line('Llegó (congelado)',kgs(c.rec)):'')+ph('llego')+(has('merma')?line('Merma al limpiar',gr(c.merma)+(c.rec?' · '+ppct(c.merma/c.rec):'')):'')+ph('merma')+(has('final')?line('Peso final limpio / descongelado',kgs(c.fin),'total'):'')+ph('final');
      if(has('llego')&&has('final')){
        h+=line('Pérdida al descongelar',gr(Math.max(c.loss,0))+' · '+ppct(c.rec?Math.max(c.loss,0)/c.rec:0));
        h+='<div class="prod-res info">⚖️ Rendimiento: de '+kgs(c.rec)+' quedaron '+kgs(c.fin)+' ('+ppct(c.rec?c.fin/c.rec:0)+')</div>';
      }
      return h+'</div>';
    }
    if(s.type==='meat'){
      h+=(has('llego')?line('Llegó',kgs(c.rec)):'')+ph('llego')+(has('merma')?line('Merma al limpiar',gr(c.merma)+(c.rec?' · '+ppct(c.merma/c.rec):'')):'')+ph('merma')+(has('llego')?line('Carne limpia (llegó − merma)',gr(c.clean),'total'):'')+
        (has('x1')?line('Porciones x1',nf(c.x1)+' × 80 g = '+gr(c.x1*P1)):'')+(!s.only1&&has('x2')?line('Porciones x2',nf(c.x2)+' × 160 g = '+gr(c.x2*P2)):'')+(c.used?line('Total porcionado',gr(c.used),'total'):'');
      if(c.ok!==null)h+='<div class="prod-res '+(c.ok?'ok':'bad')+'">'+(c.ok?'✅ Cuadra: porcionó '+gr(c.used)+' de '+gr(c.clean)+' limpios'+(Math.abs(c.diff)>=1?' (diferencia '+(c.diff>0?'+':'−')+gr(Math.abs(c.diff))+')':''):(c.diff<0?'⚠️ No cuadra: faltan '+gr(-c.diff)+' ('+ppct(c.clean?-c.diff/c.clean:0)+'). Quedaron '+gr(c.clean)+' limpios y solo se porcionaron '+gr(c.used)+'.':'⚠️ No cuadra: sobran '+gr(c.diff)+'. Se porcionó más de lo que quedó limpio ('+gr(c.clean)+').'))+'</div>';
    }else{
      h+=(has('llego')?line('Llegó',kgs(c.rec))+line('Deberían salir',nf(c.expected)+' paquetes x3'):'')+ph('llego')+(has('packs')?line('Paquetes x3 que salieron',nf(c.packs)+' × 480 g = '+gr(c.used),'total'):'');
      if(c.ok!==null)h+='<div class="prod-res '+(c.ok?'ok':'bad')+'">'+(c.ok?'✅ Cuadra: '+nf(c.packs)+' paquetes = '+gr(c.used)+' de '+gr(c.rec)+' que llegaron':(c.diff<0?'⚠️ No cuadra: faltan '+gr(-c.diff)+' (≈ '+nf(-c.diff/PACK)+' paquetes).':'⚠️ No cuadra: sobran '+gr(c.diff)+'. Salieron más paquetes de lo que alcanza con lo que llegó.'))+'</div>';
    }
    return h+'</div>';
  }
  function reportCard(r,open){
    const secs=PROD_SECTIONS.filter(s=>r.data?.[s.k]),allOk=secs.every(s=>prodCalc(s,r.data[s.k]).ok!==false);
    const when=new Date(r.created_at).toLocaleString('es-CO',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    return '<section class="panel" data-rcard="'+r.id+'"><div class="row"><div><b>'+(allOk?'✅':'⚠️')+' Producción · '+h(when)+'</b><div class="hint">'+h(r.created_by_name||'')+' · '+secs.map(s=>s.title).join(', ')+'</div></div>'+(open?'':'<button class="btn secondary" data-ropen="'+r.id+'">Ver</button>')+'</div>'+
      (open?secs.map(s=>sectionResult(s,r.data[s.k],r)).join('')+(r.note?'<p class="hint">Nota: '+h(r.note)+'</p>':''):'')+'</section>';
  }
  async function loadPhotos(container,r){
    const paths=Object.values(r.photos||{}).flat();if(!paths.length)return;
    const {data,error}=await client.storage.from('produccion').createSignedUrls(paths,3600);
    if(error)return;
    const url={};(data||[]).forEach(x=>{if(x.signedUrl)url[x.path]=x.signedUrl;});
    Object.entries(r.photos).forEach(([key,list])=>{const el=container.querySelector('[data-ph="'+r.id+'|'+key+'"]');if(el)el.innerHTML=list.filter(p=>url[p]).map(p=>'<a href="'+url[p]+'" target="_blank" rel="noopener"><img src="'+url[p]+'" alt="Evidencia"></a>').join('');});
  }
  async function productionReports(container){
    container.dataset.view='reports';
    const {data,error}=await client.from('production_reports').select('*').order('created_at',{ascending:false}).limit(40);
    if(error)throw error;
    if(prodUnread){await client.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).eq('kind','production').is('read_at',null);prodUnread=0;setBadges();}
    container.innerHTML='<h1>Reportes de producción</h1>'+(canProduce()?'<button class="btn" id="prodNew">+ Nuevo reporte</button>':'')+
      ((data||[]).length?data.map((r,i)=>reportCard(r,i===0)).join(''):box('<p class="muted">Todavía no hay reportes de producción.</p>'));
    document.getElementById('prodNew')?.addEventListener('click',()=>productionForm(container,()=>productionReports(container)));
    const bind=()=>container.querySelectorAll('[data-ropen]').forEach(b=>b.onclick=()=>{const r=data.find(x=>x.id===b.dataset.ropen);b.closest('section').outerHTML=reportCard(r,true);loadPhotos(container,r);bind();});
    bind();
    if(data?.[0])loadPhotos(container,data[0]);
  }
  async function openProductionStaff(){
    root.innerHTML='<div class="row"><b>'+h(profile.display_name)+'</b><button class="btn secondary" id="prodBack">← Volver a operación</button></div><div id="prodBody"><p class="muted">Cargando…</p></div>';
    document.getElementById('prodBack').onclick=()=>window.enter('camila');
    const body=document.getElementById('prodBody');
    try{await productionReports(body);}catch(e){body.innerHTML=box(h(e.message||String(e)));}
  }
  function productionHome(){
    root.innerHTML=header()+'<div id="prodBody"></div>';
    bindHeader();
    productionForm(document.getElementById('prodBody'),()=>productionHome());
  }
  window.TOQUIN_PRODUCTION={
    tab:()=>profile&&['admin','toquijefa'].includes(profile.role)?'<button class="tab" onclick="TOQUIN_PRODUCTION.open()">Producción<span data-prod-badge>'+(prodUnread?' ('+prodUnread+')':'')+'</span></button>':'',
    open:()=>openProductionStaff()
  };
  client.auth.onAuthStateChange((_event,session)=>{if(!session&&user){user=null;profile=null;login();}});
  start();
})();
