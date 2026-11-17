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
      if(window.TOQUIN_RECIPES) await window.TOQUIN_RECIPES.init({username:credentials?.username,password:credentials?.password,role:profile.role});
      window.TOQUIN_RETURN_STAFF=staffHome;
      return staffHome();
    }
    if(profile.role==='toquijefe')return ordersHome(false);
    if(profile.role==='tachu')return ordersHome(true);
    await client.auth.signOut();login('Rol no autorizado.');
  }
  function header(){
    return '<div class="row"><b>'+h(profile.display_name)+' · '+h(roles[profile.role])+'</b><div><button class="btn secondary" id="changePassword">Cambiar contraseña</button> <button class="btn danger" id="logout">Cerrar sesión</button></div></div><div id="profileBox"></div>';
  }
  function bindHeader(){
    document.getElementById('logout')?.addEventListener('click',async()=>{if(live)await client.removeChannel(live);await client.auth.signOut();user=null;profile=null;login();});
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
  async function staffHome(){
    const {data,error}=await client.from('app_state').select('data,updated_at').eq('id','main').maybeSingle();
    if(data?.data && window.TOQUIN_LEGACY) window.TOQUIN_LEGACY.setState(data.data);
    window.addEventListener('toquin-state-changed', async event => { try { await client.from('app_state').upsert({id:'main',data:event.detail,updated_by:user.id,updated_at:new Date().toISOString()}); } catch(e) { console.warn('sync failed',e); } });
    root.innerHTML=header()+'<h1>Operación TOQUÍN</h1>'+box('<p>Horario, turnos, tarifas y nómina compartidos entre dispositivos.</p><button class="btn" id="openOps">Abrir horario y nómina</button> <button class="btn secondary" id="openRecipes">Recetas</button><p id="syncInfo" class="hint">'+(error?'Sin conexión de datos: '+h(error.message):'Última actualización: '+h(data?.updated_at||'Aún sin datos'))+'</p>')+(profile.role==='admin'?usersPanel():'');
    bindHeader();
    document.getElementById('openRecipes').onclick=()=>window.TOQUIN_RECIPES?.open();
    document.getElementById('openOps').onclick=()=>{if(window.TOQUIN_LEGACY)window.TOQUIN_LEGACY.setState(data?.data||{});location.hash='#operacion';document.getElementById('syncInfo').textContent='Horario y nómina compartidos activos.';};
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
  async function ordersHome(isRequester){
    const inventory=await loadInventory();
    root.innerHTML=header()+(isRequester?'<h1>Nuevo pedido de materia prima</h1>':'<h1>Pedidos recibidos de Tachu</h1>')+
      (isRequester?box('<label class="field">Buscar producto<input id="inventoryQuery" placeholder="Buscar materia prima"></label><div id="inventoryOptions"></div><h2>Productos del pedido</h2><div id="draftRows"></div><label class="field">Nota general<textarea id="orderGeneralNote"></textarea></label><button class="btn" id="submitOrder">Enviar pedido</button>'):'<div id="ordersList"></div>')+
      '<h2>Historial de pedidos</h2><div id="orderHistory"></div>';
    bindHeader();
    let draft=[];
    const paintDraft=()=>{
      document.getElementById('draftRows').innerHTML=draft.map((item,i)=>'<div class="item"><span style="flex:1">'+h(item.name)+'</span><input data-q="'+i+'" style="max-width:95px" placeholder="Cantidad" value="'+h(item.qty)+'"><input data-n="'+i+'" placeholder="Nota" value="'+h(item.note)+'"><button class="btn danger" data-x="'+i+'">×</button></div>').join('');
      document.querySelectorAll('[data-q]').forEach(e=>e.onchange=()=>draft[+e.dataset.q].qty=e.value);
      document.querySelectorAll('[data-n]').forEach(e=>e.onchange=()=>draft[+e.dataset.n].note=e.value);
      document.querySelectorAll('[data-x]').forEach(e=>e.onclick=()=>{draft.splice(+e.dataset.x,1);paintDraft();});
    };
    if(isRequester){
      document.getElementById('inventoryQuery').oninput=()=>{
        const q=document.getElementById('inventoryQuery').value.toLowerCase();
        const found=inventory.filter(x=>x.name.toLowerCase().includes(q)).slice(0,30);
        document.getElementById('inventoryOptions').innerHTML=found.map(x=>'<button class="item" style="width:100%;text-align:left" data-item="'+x.id+'">'+h(x.name)+' ＋</button>').join('')+'<button class="btn secondary" id="newProduct">+ Producto nuevo</button>';
        document.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{const item=inventory.find(x=>x.id===b.dataset.item);draft.push({inventory_id:item.id,name:item.name,qty:'',note:''});paintDraft();});
        document.getElementById('newProduct').onclick=()=>{const name=prompt('Nombre del producto nuevo');if(name){draft.push({inventory_id:null,name,qty:'',note:''});paintDraft();}};
      };
      document.getElementById('submitOrder').onclick=async()=>{
        if(!draft.length||draft.some(x=>!x.qty.trim()))return alert('Completa productos y cantidades.');
        const {data:order,error}=await client.from('purchase_orders').insert({created_by:user.id,general_note:document.getElementById('orderGeneralNote').value}).select().single();
        if(error)return alert(error.message);
        const items=draft.map(x=>({order_id:order.id,inventory_id:x.inventory_id,product_name:x.name,quantity_requested:x.qty,tachu_note:x.note}));
        const result=await client.from('purchase_order_items').insert(items);
        if(result.error)return alert(result.error.message);
        draft=[];alert('Pedido enviado.');ordersHome(true);
      };
    }else{
      const {data,error}=await client.from('purchase_orders').select('*,purchase_order_items(*)').order('created_at',{ascending:false}).limit(100);
      const el=document.getElementById('ordersList');
      if(el)el.innerHTML=error?h(error.message):(data||[]).map(o=>'<button class="panel" data-order="'+o.id+'" style="width:100%;text-align:left;color:inherit"><b>'+new Date(o.created_at).toLocaleString('es-CO')+'</b><p>'+h(o.status)+' · '+o.purchase_order_items.length+' productos</p>'+h(o.general_note)+'</button>').join('')||box('Aún no hay pedidos.');
      el?.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>openOrder(b.dataset.order));
    }
    renderHistory();
    watchOrders(isRequester);
  }
  async function renderHistory(){
    const {data,error}=await client.from('purchase_orders').select('id,created_at,status,purchase_order_items(id)').order('created_at',{ascending:false}).limit(100);
    const el=document.getElementById('orderHistory');if(el)el.innerHTML=error?h(error.message):(data||[]).map(o=>'<button class="item" style="width:100%;text-align:left" data-history="'+o.id+'">'+new Date(o.created_at).toLocaleString('es-CO')+' · '+h(o.status)+' · '+o.purchase_order_items.length+' productos</button>').join('');
    el?.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>openOrder(b.dataset.history));
  }
  async function openOrder(id){
    const {data:o,error}=await client.from('purchase_orders').select('*,purchase_order_items(*)').eq('id',id).single();
    if(error)return alert(error.message);
    const isBuyer=profile.role==='admin'||profile.role==='toquijefe';
    root.innerHTML=header()+'<button class="btn secondary" id="ordersBack">← Volver</button><h1>Pedido · '+h(o.status)+'</h1><p>'+new Date(o.created_at).toLocaleString('es-CO')+'</p>'+box(h(o.general_note))+
      o.purchase_order_items.map(i=>'<section class="panel"><h2>'+h(i.product_name)+'</h2><p>Solicitado: '+h(i.quantity_requested)+'</p>'+
      (isBuyer?'<label class="field">Estado<select id="status-'+i.id+'"><option>Comprado</option><option>No comprado</option><option>Otra cantidad</option></select></label><label class="field">Cantidad comprada<input id="bought-'+i.id+'" value="'+h(i.quantity_purchased||'')+'"></label><label class="field">Nota para Tachu<textarea id="buyer-note-'+i.id+'">'+h(i.luisda_note)+'</textarea></label>':'<p>'+h(i.status)+' · Comprado: '+h(i.quantity_purchased||'—')+'</p><p>'+h(i.luisda_note)+'</p>')+
      '<p class="hint">Nota inicial de Tachu: '+h(i.tachu_note)+'</p><div id="itemNotes-'+i.id+'"></div><label class="field">Añadir nota<input id="note-'+i.id+'"></label><button class="btn secondary" data-note="'+i.id+'">Enviar nota</button></section>').join('')+
      (isBuyer?'<button class="btn" id="replyOrder">Enviar respuesta a Tachu</button>':'');
    bindHeader();
    document.getElementById('ordersBack').onclick=()=>ordersHome(profile.role==='tachu');
    document.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>sendNote(b.dataset.note));
    for(const item of o.purchase_order_items)loadNotes(item.id);
    if(isBuyer)document.getElementById('replyOrder').onclick=()=>reply(o);
  }
  async function loadNotes(itemId){
    const {data}=await client.from('order_item_notes').select('author_role,note,created_at').eq('order_item_id',itemId).order('created_at');
    const el=document.getElementById('itemNotes-'+itemId);
    if(el)el.innerHTML=(data||[]).map(n=>'<p class="hint">'+h(n.author_role)+' · '+h(n.note)+'</p>').join('');
  }
  async function sendNote(itemId){
    const note=document.getElementById('note-'+itemId).value.trim();if(!note)return;
    const {error}=await client.from('order_item_notes').insert({order_item_id:itemId,author_id:user.id,author_role:profile.role,note});
    if(error)return alert(error.message);
    document.getElementById('note-'+itemId).value='';loadNotes(itemId);
  }
  async function reply(order){
    for(const item of order.purchase_order_items){
      const patch={status:document.getElementById('status-'+item.id).value,quantity_purchased:document.getElementById('bought-'+item.id).value,luisda_note:document.getElementById('buyer-note-'+item.id).value};
      const {error}=await client.from('purchase_order_items').update(patch).eq('id',item.id);if(error)return alert(error.message);
    }
    const {error}=await client.from('purchase_orders').update({status:'Respondido',replied_at:new Date().toISOString()}).eq('id',order.id);
    if(error)return alert(error.message);ordersHome(false);
  }
  function watchOrders(isRequester){
    if(live)client.removeChannel(live);
    live=client.channel('toquin-orders-'+user.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'purchase_orders'},()=>{renderHistory();if(!isRequester)ordersHome(false);})
      .on('postgres_changes',{event:'*',schema:'public',table:'purchase_order_items'},()=>renderHistory())
      .subscribe();
  }
  client.auth.onAuthStateChange((_event,session)=>{if(!session&&user){user=null;profile=null;login();}});
  start();
})();
