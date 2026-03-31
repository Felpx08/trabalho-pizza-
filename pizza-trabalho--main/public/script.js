const API = '/api'; // Base da URL para as chamadas do servidor

let cPizzas   = []; // Cache local de pizzas para evitar excesso de requisições
let cClientes = []; // Cache local de clientes

// Recupera Token e Dados do Usuário do LocalStorage (persistência de sessão)
let TOKEN          = localStorage.getItem('pz_token') || '';
let USUARIO_LOGADO = JSON.parse(localStorage.getItem('pz_usuario') || 'null');
let mesaEmFechamento = null; // Armazena temporariamente a mesa que está sendo finalizada

async function fazerLogin() { // função de cadastro/ login
  const email = document.getElementById('l-email').value.trim();
  const senha = document.getElementById('l-senha').value;
  const btn   = document.getElementById('btn-login');
  const erro  = document.getElementById('login-erro');

  if (!email || !senha) {
    erro.style.display = 'block';
    erro.textContent   = 'Preencha e-mail e senha.';
    return;
  }

  btn.disabled    = true; // Evita cliques duplos durante a requisição
  btn.textContent = 'Entrando...';
  
  try {
    const res  = await fetch(API + '/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, senha }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Credenciais inválidas');

    // Salva os dados de acesso para não precisar logar novamente ao atualizar a página
    TOKEN = data.token;
    USUARIO_LOGADO = data.usuario;
    localStorage.setItem('pz_token', TOKEN);
    localStorage.setItem('pz_usuario', JSON.stringify(data.usuario));

    aplicarPerfil(data.usuario); // Ajusta a interface conforme o cargo (Admin/Garçom)
    document.body.classList.add('logado');

  } catch (e) {
    erro.style.display = 'block';
    erro.textContent   = e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  }
}


function sair() { // 
  TOKEN = '';
  USUARIO_LOGADO = null;
  localStorage.removeItem('pz_token');
  localStorage.removeItem('pz_usuario');
  document.body.classList.remove('logado');
  document.getElementById('l-senha').value = '';
}

if (TOKEN && USUARIO_LOGADO) {
  aplicarPerfil(USUARIO_LOGADO);
  document.body.classList.add('logado');
}

function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `show ${tipo}`;
  setTimeout(() => el.className = '', 3000);
}

function abrir(id)  { document.getElementById(id).classList.add('open'); } // 
function fechar(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-bg').forEach(bg =>
  bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); })
);

function R$(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

function badge(s) { // função pra verifcar os status do pedido
  const r = {
    recebido:     '📥 Recebido',
    em_preparo:   '👨‍🍳 Em Preparo',
    saiu_entrega: '🛵 Saiu p/ Entrega',
    entregue:     '✅ Entregue',
    cancelado:    '❌ Cancelado',
  };
  return `<span class="badge b-${s}">${r[s] || s}</span>`;
}

async function api(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API + url, opts);
  const data = await res.json();

  if (res.status === 401) { sair(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}

function aplicarPerfil(usuario) { // função pra verificar o cargo do usuario, se é cliente ou ou administrador
  document.getElementById('sb-nome').textContent   = usuario.nome;
  document.getElementById('sb-perfil').textContent = usuario.perfil;

  const perfil  = usuario.perfil;
  const isAdmin = perfil === 'Administrador';
  const isGar   = perfil === 'Garcom';

  function show(id, visible, type = 'flex') {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? type : 'none';
  }

  function showEl(el, visible, type = 'flex') {
    if (el) el.style.display = visible ? type : 'none';
  }

  show('menu-usuarios',   isAdmin, 'block');
  show('btn-usuarios',    isAdmin, 'flex');
  show('sb-group-garcom', isGar,   'block');
  show('btn-nav-mesas',   isGar,   'flex');

  showEl(document.querySelector('[onclick*="clientes"]'),  !isGar);
  showEl(document.querySelector('[onclick*="pedidos"]'),   !isGar);
  showEl(document.querySelector('[onclick*="dashboard"]'), !isGar);
  showEl(document.querySelector('.sb-group'), !isGar, 'block');

  const labelPizzas = document.getElementById('nav-pizzas-label');
  if (labelPizzas) labelPizzas.textContent = isGar ? 'Cardápio' : 'Pizzas';

  const tituloPizzas = document.getElementById('pg-pizzas-titulo');
  const subPizzas    = document.getElementById('pg-pizzas-sub');
  if (tituloPizzas) tituloPizzas.textContent = isGar ? 'Cardápio' : 'Pizzas';
  if (subPizzas)    subPizzas.textContent    = isGar ? 'Pizzas disponíveis hoje' : 'Gerencie o cardápio';
  show('btn-nova-pizza', !isGar, 'inline-flex');

  show('stat-fat', !isGar, 'block');
  show('stat-cli', !isGar, 'block');

  if (isGar) {
    ir('mesas', document.getElementById('btn-nav-mesas'));
  } else {
    ir('dashboard', document.querySelector('[onclick*="dashboard"]'));
  }
}

async function carregarMesas(mesaFiltro = null) {
  const grid = document.getElementById('grid-mesas');
  grid.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';

  document.getElementById('mesas-sub').textContent =
    `Olá, ${USUARIO_LOGADO?.nome}! Seus pedidos ativos.`;

  try {
    const url = `/pedidos?garcom=${USUARIO_LOGADO.id}`;
    const pedidos = await api('GET', url);

    const ativos = pedidos.filter(p => !['entregue','cancelado'].includes(p.status));

    document.getElementById('g-ped').textContent     = pedidos.length;
    document.getElementById('g-ped-sub').textContent = `${ativos.length} ativo(s)`;

    // verificar os status da mesa, se o pedido saiu ou não
    const mesasAtivas = new Set(ativos.map(p => p.mesa).filter(Boolean)); 
    document.getElementById('g-mesas').textContent   = mesasAtivas.size;
    document.getElementById('g-preparo').textContent = ativos.filter(p => p.status === 'em_preparo').length;
    document.getElementById('g-prontos').textContent = ativos.filter(p => p.status === 'saiu_entrega').length;

    const botoes = document.getElementById('mesa-botoes');
    botoes.innerHTML = Array.from({length: 10}, (_, i) => {
      const n      = i + 1;
      const temPed = mesasAtivas.has(n);
      const ativo  = mesaFiltro === n;
      return `
        <button class="btn btn-sm ${ativo ? 'btn-red' : temPed ? 'btn-green' : 'btn-ghost'}"
          onclick="carregarMesas(${n})"
          title="${temPed ? 'Mesa com pedido ativo' : 'Mesa livre'}">
          ${n}${temPed ? ' 🔴' : ''}
        </button>`;
    }).join('');

    const pedidosFiltrados = mesaFiltro
      ? ativos.filter(p => p.mesa === mesaFiltro)
      : ativos;

    if (!pedidosFiltrados.length) {
      grid.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <span class="ei">🪑</span>
          Nenhum pedido ativo no momento.<br>
          <button class="btn btn-red" style="margin-top:12px" onclick="abrirPedidoMesa()">
            + Abrir primeiro pedido
          </button>
        </div>`;
      return;
    }

    const porMesa = {};
    pedidosFiltrados.forEach(p => {
      const key = p.mesa || 'balcão';
      if (!porMesa[key]) porMesa[key] = [];
      porMesa[key].push(p);
    });

    grid.innerHTML = Object.entries(porMesa).map(([mesa, peds]) => {
      const totalMesa  = peds.reduce((s, p) => s + (p.total || 0), 0);
      const todosItens = peds.flatMap(p => p.itens);
      const itensAgrup = {};
      todosItens.forEach(it => {
        const k = `${it.nomePizza} (${it.tamanho})`;
        itensAgrup[k] = (itensAgrup[k] || 0) + it.quantidade;
      });
      const statusAtual = peds[peds.length - 1]?.status;

      return `
        <div class="mesa-card">
          <div class="mesa-card-head">
            <div>
              <div class="mesa-num">Mesa ${mesa}</div>
              <div style="font-size:.72rem;color:var(--muted);margin-top:2px">
                ${peds.length} pedido(s) · ${peds[0]?.cliente?.nome || 'Sem cadastro'}
              </div>
            </div>
            ${badge(statusAtual)}
          </div>
          <div class="mesa-card-body">
            ${Object.entries(itensAgrup).map(([nome, qtd]) => `
              <div class="mesa-item">
                <strong>${qtd}x ${nome}</strong>
              </div>`).join('')}
            <div class="mesa-total">
              <span style="color:var(--muted)">Total da mesa</span>
              <span style="color:var(--gold)">${R$(totalMesa)}</span>
            </div>
          </div>
          <div class="mesa-card-foot">
            <button class="btn btn-ghost btn-sm" style="flex:1"
              onclick="abrirPedidoMesa(${mesa})">
              + Item
            </button>
            <button class="btn btn-blue btn-sm"
              onclick="abrirStatus('${peds[peds.length-1]?._id}','${statusAtual}')">
              📝 Status
            </button>
            <button class="btn btn-green btn-sm"
              onclick="abrirFecharMesa(${mesa}, ${totalMesa}, '${peds.map(p=>p._id).join(',')}')">
              ✅ Fechar
            </button>
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    grid.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}
// verificar o que a mesa pediu e o cliente 
async function abrirPedidoMesa(mesaNum = null) { 
  try {
    if (!cPizzas.length)   cPizzas   = await api('GET', '/pizzas');
    if (!cClientes.length) cClientes = await api('GET', '/clientes');
  } catch (e) { toast('Erro ao carregar dados', 'err'); return; }

  document.getElementById('pm-cli').innerHTML =
    '<option value="">— Sem cadastro —</option>' +
    cClientes.map(c => `<option value="${c._id}">${c.nome} · ${c.telefone}</option>`).join('');

  document.getElementById('pm-mesa').value = mesaNum || '';
  document.getElementById('itens-mesa-lista').innerHTML = '';
  document.getElementById('pm-obs').value  = '';
  document.getElementById('pm-sub').textContent = 'R$ 0,00';
  document.getElementById('pm-tot').textContent = 'R$ 0,00';

  addItemMesa();
  abrir('m-pedido-mesa');
}

function addItemMesa() { // ira verificar os itens que a mesa pediu 
  const d = document.createElement('div');
  d.className = 'item-row';
  const opts = cPizzas.filter(p => p.disponivel)
    .map(p => `<option value="${p._id}"
      data-p="${p.precos?.P||0}" data-m="${p.precos?.M||0}" data-g="${p.precos?.G||0}">
      ${p.nome}</option>`).join('');
  d.innerHTML = `
    <select class="ip" onchange="recalcMesa()"><option value="">Selecione...</option>${opts}</select>
    <select class="it" onchange="recalcMesa()">
      <option value="P">P</option><option value="M">M</option><option value="G" selected>G</option>
    </select>
    <input class="iq" type="number" value="1" min="1" oninput="recalcMesa()">
    <div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">R$ 0,00</div>
    <button class="btn-rm" onclick="this.parentElement.remove();recalcMesa()">×</button>`;
  document.getElementById('itens-mesa-lista').appendChild(d);
}

function recalcMesa() {
  let sub = 0;
  document.querySelectorAll('#itens-mesa-lista .item-row').forEach(row => {
    const sel = row.querySelector('.ip');
    const tam = row.querySelector('.it').value.toLowerCase();
    const qtd = parseInt(row.querySelector('.iq').value) || 0;
    const pc  = parseFloat(sel.options[sel.selectedIndex]?.dataset?.[tam] || 0);
    const s   = pc * qtd; sub += s;
    row.querySelector('.is').textContent = R$(s);
  });
  document.getElementById('pm-sub').textContent = R$(sub);
  document.getElementById('pm-tot').textContent = R$(sub);
}

async function salvarPedidoMesa() { // ira salvar e listar o pedido da mesa
  const mesa = parseInt(document.getElementById('pm-mesa').value) || 0;
  if (!mesa || mesa < 1) { toast('Selecione a mesa', 'err'); return; }

  const cliId = document.getElementById('pm-cli').value || null;
  const itens = []; let valido = true;
  document.querySelectorAll('#itens-mesa-lista .item-row').forEach(row => {
    const pid = row.querySelector('.ip').value;
    if (!pid) { valido = false; return; }
    itens.push({
      pizza:      pid,
      tamanho:    row.querySelector('.it').value,
      quantidade: parseInt(row.querySelector('.iq').value) || 1,
    });
  });

  if (!valido || !itens.length) { toast('Adicione ao menos um item', 'err'); return; }

  let clienteId = cliId;
  if (!clienteId) {
    try {
      const todos = await api('GET', `/clientes?busca=Mesa ${mesa}`);
      const existe = todos.find(c => c.nome === `Mesa ${mesa}`);
      if (existe) {
        clienteId = existe._id;
      } else {
        const novo = await api('POST', '/clientes', { nome: `Mesa ${mesa}`, telefone: 'Mesa' });
        clienteId = novo._id;
        cClientes = [];
      }
    } catch (e) { toast('Erro ao registrar mesa', 'err'); return; }
  }

  try {
    await api('POST', '/pedidos', {
      cliente:        clienteId,
      itens,
      taxaEntrega:    0,
      formaPagamento: 'pix',
      observacoes:    document.getElementById('pm-obs').value,
      mesa,
      origem:         'mesa',
      garcom:         USUARIO_LOGADO?.id,
    });
    toast(`Pedido lançado na Mesa ${mesa}! 🍕`);
    fechar('m-pedido-mesa');
    carregarMesas();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

function abrirFecharMesa(mesa, total, ids) { // verifica os status da mesa, se foi entregue ou não 
  mesaEmFechamento = { mesa, total, ids: ids.split(',') };
  document.getElementById('fm-titulo').textContent = `Fechar Mesa ${mesa}`;
  document.getElementById('fm-total').textContent  = R$(total);
  document.getElementById('fm-resumo').innerHTML   =
    `<p style="font-size:.82rem;color:var(--muted)">
      ${mesaEmFechamento.ids.length} pedido(s) serão marcados como <strong style="color:var(--green)">Entregue</strong>.
    </p>`;
  abrir('m-fechar-mesa');
}

async function confirmarFechamento() {
  if (!mesaEmFechamento) return;

  try {
    await Promise.all(
      mesaEmFechamento.ids.map(id =>
        api('PATCH', `/pedidos/${id}/status`, { status: 'entregue' })
      )
    );
    toast(`Mesa ${mesaEmFechamento.mesa} fechada! ✅`);
    fechar('m-fechar-mesa');
    mesaEmFechamento = null;
    carregarMesas();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

function ir(pg, btn) {
  const perfil = document.getElementById('sb-perfil').textContent;
  if (pg === 'usuarios' && perfil !== 'Administrador') {
    toast('Acesso restrito a Administradores', 'err'); return;
  }
  if (pg === 'mesas' && perfil !== 'Garcom') {
    toast('Área exclusiva para Garçom', 'err'); return;
  }
  if (perfil === 'Garcom' && !['mesas','pizzas'].includes(pg)) {
    toast('Acesso não permitido para Garçom', 'err'); return;
  }
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('ativo'));
  document.getElementById('pg-' + pg).classList.add('ativa');
  if (btn) btn.classList.add('ativo');
  const loaders = {
    dashboard: carregarDashboard,
    pedidos:   carregarPedidos,
    pizzas:    carregarPizzas,
    clientes:  carregarClientes,
    usuarios:  carregarUsuarios,
    mesas:     carregarMesas,
  };
  if (loaders[pg]) loaders[pg]();
}

async function carregarDashboard() { // mostra a tela principal do administrador, dinheiro, pedido e a quantidade de clientes 
  const h = new Date().getHours();
  const s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('dash-sub').textContent = `${s}! Aqui está o resumo.`;

  try {
    const [pizzas, clientes, pedidos] = await Promise.all([
      api('GET', '/pizzas'),
      api('GET', '/clientes'),
      api('GET', '/pedidos'),
    ]);

    cPizzas   = pizzas;
    cClientes = clientes;

    document.getElementById('s-piz').textContent = pizzas.length;
    document.getElementById('s-cli').textContent = clientes.length;
    document.getElementById('s-ped').textContent = pedidos.length;
    document.getElementById('s-ent').textContent =
      pedidos.filter(p => p.status === 'saiu_entrega').length;
    document.getElementById('s-fat').textContent =
      R$(pedidos.reduce((acc, p) => acc + (p.total || 0), 0));

    const pend = pedidos.filter(p => !['entregue','cancelado'].includes(p.status)).length;
    document.getElementById('s-ped-sub').textContent = `${pend} pendente(s)`;

    const elP = document.getElementById('dash-pedidos');
    elP.innerHTML = pedidos.slice(0, 8).map(p => `
      <div class="mini-row">
        <div>
          <div class="mn">#${String(p.numeroPedido || '?').padStart(3,'0')} · ${p.cliente?.nome || '—'}</div>
          <div class="mc">${new Date(p.createdAt).toLocaleString('pt-BR')}</div>
        </div>
        <div style="text-align:right">
          ${badge(p.status)}<br>
          <small style="color:var(--muted)">${R$(p.total)}</small>
        </div>
      </div>`).join('') ||
      '<div class="empty"><span class="ei">📋</span>Nenhum pedido ainda</div>';

    const elC = document.getElementById('dash-cardapio');
    elC.innerHTML = pizzas.filter(p => p.disponivel).slice(0, 8).map(p => `
      <div class="mini-row">
        <span>🍕 ${p.nome}</span>
        <small style="color:var(--muted)">${R$(p.precos?.G)}</small>
      </div>`).join('') ||
      '<div class="empty"><span class="ei">🍕</span>Nenhuma pizza</div>';

  } catch (e) { toast('Erro dashboard: ' + e.message, 'err'); }
}

async function carregarPizzas() { // ira mostrar tudo sobre a pizza 
  const el = document.getElementById('tbl-pizzas');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    cPizzas = await api('GET', '/pizzas');
    if (!cPizzas.length) {
      el.innerHTML = '<div class="empty"><span class="ei">🍕</span>Nenhuma pizza</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr><th>Nome</th><th>Categoria</th><th>Ingredientes</th><th>P</th><th>M</th><th>G</th><th>Status</th><th>Ações</th>
        </thead>
        <tbody>
          ${cPizzas.map(p => `
            <tr>
              <td><strong>${p.nome}</strong><br><small style="color:var(--muted)">${p.descricao || ''}</small></td>
              <td><span class="badge b-cat">${p.categoria || 'tradicional'}</span></td>
              <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.ingredientes}</td>
              <td>${R$(p.precos?.P)}</td>
              <td>${R$(p.precos?.M)}</td>
              <td><strong style="color:var(--gold)">${R$(p.precos?.G)}</strong></td>
              <td><span class="badge ${p.disponivel ? 'b-on' : 'b-off'}">${p.disponivel ? '✅ Disponível' : '❌ Off'}</span></td>
              <td><div style="display:flex;gap:5px"><button class="btn btn-ghost btn-sm" onclick="editarPizza('${p._id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="deletarPizza('${p._id}','${p.nome}')">🗑️</button></div></td>
             </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

function abrirPizza() { // adiciona novas pizzas
  document.getElementById('m-pizza-t').textContent = 'Nova Pizza';
  ['p-id','p-nome','p-ing','p-desc','p-pp','p-pm','p-pg']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('p-cat').value  = 'tradicional';
  document.getElementById('p-disp').value = 'true';
  abrir('m-pizza');
}

function editarPizza(id) { // voce consegue personalizar a pizza 
  const p = cPizzas.find(x => x._id === id);
  if (!p) return;
  document.getElementById('m-pizza-t').textContent = 'Editar Pizza';
  document.getElementById('p-id').value   = p._id;
  document.getElementById('p-nome').value = p.nome;
  document.getElementById('p-ing').value  = p.ingredientes;
  document.getElementById('p-desc').value = p.descricao || '';
  document.getElementById('p-pp').value   = p.precos?.P || '';
  document.getElementById('p-pm').value   = p.precos?.M || '';
  document.getElementById('p-pg').value   = p.precos?.G || '';
  document.getElementById('p-cat').value  = p.categoria || 'tradicional';
  document.getElementById('p-disp').value = String(p.disponivel);
  abrir('m-pizza');
}

async function salvarPizza() {
  const id   = document.getElementById('p-id').value;
  const nome = document.getElementById('p-nome').value.trim();
  const ing  = document.getElementById('p-ing').value.trim();
  if (!nome || !ing) { toast('Nome e ingredientes são obrigatórios', 'err'); return; }

  const d = {
    nome,
    ingredientes: ing,
    descricao:    document.getElementById('p-desc').value.trim(),
    precos: {
      P: parseFloat(document.getElementById('p-pp').value) || 0,
      M: parseFloat(document.getElementById('p-pm').value) || 0,
      G: parseFloat(document.getElementById('p-pg').value) || 0,
    },
    categoria:  document.getElementById('p-cat').value,
    disponivel: document.getElementById('p-disp').value === 'true',
  };

  try {
    id ? await api('PUT', '/pizzas/' + id, d) : await api('POST', '/pizzas', d);
    toast(id ? 'Pizza atualizada!' : 'Pizza criada!');
    fechar('m-pizza');
    carregarPizzas();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarPizza(id, nome) { // voce consegue deletar a pizza inserida 
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/pizzas/' + id);
    toast('Pizza deletada!');
    carregarPizzas();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function carregarClientes(busca = '') { // essa rota  busca qual é o cliente
  const el = document.getElementById('tbl-clientes');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const url = busca ? `/clientes?busca=${encodeURIComponent(busca)}` : '/clientes';
    cClientes = await api('GET', url);

    if (!cClientes.length) {
      el.innerHTML = '<div class="empty"><span class="ei">👥</span>Nenhum cliente</div>';
      return;
    }

    el.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>Telefone</th><th>Endereço</th><th>Obs</th><th>Ações</th></tr></thead>
        <tbody>
          ${cClientes.map(c => `
            <tr>
              <td><strong>${c.nome}</strong></td>
              <td>${c.telefone}</td>
              <td style="font-size:.76rem;color:var(--muted)">${[c.endereco?.rua, c.endereco?.numero, c.endereco?.bairro, c.endereco?.cidade].filter(Boolean).join(', ') || '—'}</td>
              <td style="font-size:.76rem;color:var(--muted)">${c.observacoes || '—'}</td>
              <td><div style="display:flex;gap:5px"><button class="btn btn-ghost btn-sm" onclick="editarCliente('${c._id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="deletarCliente('${c._id}','${c.nome}')">🗑️</button></div></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

let _t;
function buscarCli(v) { // essa rota ja busca as informações do cliente 
  clearTimeout(_t);
  _t = setTimeout(() => carregarClientes(v), 400);
}

function abrirCliente() {
  document.getElementById('m-cli-t').textContent = 'Novo Cliente';
  ['c-id','c-nome','c-tel','c-rua','c-num','c-bairro','c-cidade','c-cep','c-comp','c-obs']
    .forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  abrir('m-cliente');
}

function editarCliente(id) { // aqui voce consegue editar as informaçoes do cliente 
  const c = cClientes.find(x => x._id === id);
  if (!c) return;
  document.getElementById('m-cli-t').textContent    = 'Editar Cliente';
  document.getElementById('c-id').value     = c._id;
  document.getElementById('c-nome').value   = c.nome;
  document.getElementById('c-tel').value    = c.telefone;
  document.getElementById('c-rua').value    = c.endereco?.rua || '';
  document.getElementById('c-num').value    = c.endereco?.numero || '';
  document.getElementById('c-bairro').value = c.endereco?.bairro || '';
  document.getElementById('c-cidade').value = c.endereco?.cidade || '';
  document.getElementById('c-cep').value    = c.endereco?.cep || '';
  document.getElementById('c-comp').value   = c.endereco?.complemento || '';
  document.getElementById('c-obs').value    = c.observacoes || '';
  abrir('m-cliente');
}

// Função para salvar ou atualizar um cliente
async function salvarCliente() {
// Pega os valores dos inputs do formulário
const id = document.getElementById('c-id').value;
const nome = document.getElementById('c-nome').value.trim();
const tel = document.getElementById('c-tel').value.trim();

// Validação básica (nome e telefone obrigatórios)
if (!nome || !tel) {
toast('Nome e telefone são obrigatórios', 'err');
return;
}

// Monta o objeto do cliente
const d = {
nome,
telefone: tel,
endereco: {
rua: document.getElementById('c-rua').value.trim(),
numero: document.getElementById('c-num').value.trim(),
bairro: document.getElementById('c-bairro').value.trim(),
cidade: document.getElementById('c-cidade').value.trim(),
cep: document.getElementById('c-cep').value.trim(),
complemento: document.getElementById('c-comp').value.trim(),
},
observacoes: document.getElementById('c-obs').value.trim(),
};

try {
// Se tiver ID → atualiza (PUT), senão → cria (POST)
id
? await api('PUT', '/clientes/' + id, d)
: await api('POST', '/clientes', d);

// Feedback visual
toast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!');

// Fecha modal e recarrega lista
fechar('m-cliente');
carregarClientes();
} catch (e) {
toast('Erro: ' + e.message, 'err');
}
}

// Função para deletar cliente
async function deletarCliente(id, nome) {
// Confirmação antes de excluir
if (!confirm(`Deletar "${nome}"?`)) return;

try {
await api('DELETE', '/clientes/' + id);
toast('Cliente deletado!');
carregarClientes();
} catch (e) {
toast('Erro: ' + e.message, 'err');
}
}

// Carrega todos os pedidos
async function carregarPedidos() {
const el = document.getElementById('tbl-pedidos');

// Mostra loading
el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';

try {
const pedidos = await api('GET', '/pedidos');

// Caso não tenha pedidos
if (!pedidos.length) {
el.innerHTML = '<div class="empty"><span class="ei">📋</span>Nenhum pedido</div>';
return;
}

// Monta tabela dinamicamente
el.innerHTML = `
<table>
<thead>
<tr>
<th>#</th><th>Cliente</th><th>Itens</th><th>Subtotal</th>
<th>Entrega</th><th>Total</th><th>Pagamento</th>
<th>Status</th><th>Data</th><th>Ações</th>
</tr>
</thead>
<tbody>
${pedidos.map(p => `
<tr>
<!-- Número do pedido -->
<td><strong style="color:var(--red)">#${String(p.numeroPedido||'?').padStart(3,'0')}</strong></td>

<!-- Dados do cliente -->
<td>
<strong>${p.cliente?.nome || '—'}</strong><br>
<small style="color:var(--muted)">${p.cliente?.telefone || ''}</small>
</td>

<!-- Lista de itens -->
<td style="font-size:.76rem">
${p.itens.map(it => `${it.quantidade}x ${it.nomePizza || '?'} (${it.tamanho})`).join('<br>')}
</td>

<!-- Valores -->
<td>${R$(p.subtotal)}</td>
<td>${R$(p.taxaEntrega)}</td>
<td><strong style="color:var(--gold)">${R$(p.total)}</strong></td>

<!-- Pagamento -->
<td style="font-size:.76rem">${(p.formaPagamento || '—').replace('_', ' ')}</td>

<!-- Status -->
<td>${badge(p.status)}</td>

<!-- Data -->
<td style="font-size:.7rem;color:var(--muted)">
${new Date(p.createdAt).toLocaleString('pt-BR')}
</td>

<!-- Botões -->
<td>
<div style="display:flex;gap:5px">
<button class="btn btn-blue btn-sm" onclick="abrirStatus('${p._id}','${p.status}')">📝</button>
<button class="btn btn-danger btn-sm" onclick="deletarPedido('${p._id}')">🗑️</button>
</div>
</td>
</tr>`).join('')}
</tbody>
</table>`;
} catch (e) {
el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
}
}

// Abre modal de pedido
async function abrirPedido() {
try {
// Carrega pizzas e clientes (cache simples)
if (!cPizzas.length) cPizzas = await api('GET', '/pizzas');
if (!cClientes.length) cClientes = await api('GET', '/clientes');
} catch (e) {
toast('Erro ao carregar dados', 'err');
return;
}

// Preenche select de clientes
document.getElementById('ped-cli').innerHTML =
'<option value="">— Selecione o cliente —</option>' +
cClientes.map(c => `<option value="${c._id}">${c.nome} · ${c.telefone}</option>`).join('');

// Reset do formulário
document.getElementById('itens-lista').innerHTML = '';
document.getElementById('ped-taxa').value = '0';
document.getElementById('ped-obs').value = '';
document.getElementById('ped-pag').value = 'pix';
document.getElementById('ped-sub').textContent = 'R$ 0,00';
document.getElementById('ped-tot').textContent = 'R$ 0,00';
document.getElementById('wrap-troco').style.display = 'none';

// Adiciona primeiro item
addItem();

// Abre modal
abrir('m-pedido');
}

// Adiciona um item ao pedido
function addItem() {
const d = document.createElement('div');
d.className = 'item-row';

// Cria opções de pizzas disponíveis
const opts = cPizzas
.filter(p => p.disponivel)
.map(p => `<option value="${p._id}" data-p="${p.precos?.P || 0}" data-m="${p.precos?.M || 0}" data-g="${p.precos?.G || 0}">${p.nome}</option>`).join('');

// HTML do item
d.innerHTML = `
<select class="ip" onchange="recalc()">
<option value="">Selecione...</option>${opts}
</select>

<select class="it" onchange="recalc()">
<option value="P">P</option>
<option value="M">M</option>
<option value="G" selected>G</option>
</select>

<input class="iq" type="number" value="1" min="1" oninput="recalc()">

<!-- Subtotal do item -->
<div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">
R$ 0,00
</div>

<!-- Botão remover -->
<button class="btn-rm" onclick="this.parentElement.remove(); recalc()">×</button>
`;

document.getElementById('itens-lista').appendChild(d);
}

// Recalcula valores do pedido
function recalc() {
let sub = 0;

// Percorre todos os itens
document.querySelectorAll('#itens-lista .item-row').forEach(row => {
const sel = row.querySelector('.ip');
const tam = row.querySelector('.it').value.toLowerCase();
const qtd = parseInt(row.querySelector('.iq').value) || 0;

// Pega preço do dataset
const opt = sel.options[sel.selectedIndex];
const pc = parseFloat(opt?.dataset?.[tam] || 0);

const s = pc * qtd;
sub += s;

// Atualiza subtotal do item
row.querySelector('.is').textContent = R$(s);
});

const taxa = parseFloat(document.getElementById('ped-taxa').value) || 0;

// Atualiza totais
document.getElementById('ped-sub').textContent = R$(sub);
document.getElementById('ped-tot').textContent = R$(sub + taxa);
}

// Mostra campo de troco apenas se pagamento for dinheiro
function toggleTroco() {
const pag = document.getElementById('ped-pag').value;
document.getElementById('wrap-troco').style.display =
pag === 'dinheiro' ? 'block' : 'none';
}

// Salva pedido
async function salvarPedido() {
const cliId = document.getElementById('ped-cli').value;

// Validação
if (!cliId) {
toast('Selecione um cliente', 'err');
return;
}

const itens = [];
let valido = true;

// Monta lista de itens
document.querySelectorAll('#itens-lista .item-row').forEach(row => {
const pid = row.querySelector('.ip').value;

if (!pid) {
valido = false;
return;
}

itens.push({
pizza: pid,
tamanho: row.querySelector('.it').value,
quantidade: parseInt(row.querySelector('.iq').value) || 1,
});
});

// Validação final
if (!valido || !itens.length) {
toast('Adicione ao menos um item válido', 'err');
return;
}

try {
await api('POST', '/pedidos', {
cliente: cliId,
itens,
taxaEntrega: parseFloat(document.getElementById('ped-taxa').value) || 0,
formaPagamento: document.getElementById('ped-pag').value,
troco: parseFloat(document.getElementById('ped-troco')?.value) || 0,
observacoes: document.getElementById('ped-obs').value,
});

toast('Pedido criado! 🍕');

fechar('m-pedido');
carregarPedidos();
} catch (e) {
toast('Erro: ' + e.message, 'err');
}
}

// Abre modal de status
function abrirStatus(id, status) {
document.getElementById('st-id').value = id;
document.getElementById('st-val').value = status;
abrir('m-status');
}

// Salva status do pedido
async function salvarStatus() {
const id = document.getElementById('st-id').value;
const status = document.getElementById('st-val').value;

try {
await api('PATCH', '/pedidos/' + id + '/status', { status });

toast('Status atualizado!');
fechar('m-status');
carregarPedidos();
} catch (e) {
toast('Erro: ' + e.message, 'err');
}
}

// Deleta pedido
async function deletarPedido(id) {
if (!confirm('Deletar este pedido?')) return;

try {
await api('DELETE', '/pedidos/' + id);
toast('Pedido deletado!');
carregarPedidos();
} catch (e) {
toast('Erro: ' + e.message, 'err');
}
}

// Carrega usuários
async function carregarUsuarios() {
const el = document.getElementById('tbl-usuarios');

el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';

try {
const us = await api('GET', '/usuarios');

if (!us.length) {
el.innerHTML = '<div class="empty"><span class="ei">🔐</span>Nenhum usuário</div>';
return;
}

// Monta tabela
el.innerHTML = `
<table>
<thead>
<tr>
<th>Nome</th><th>E-mail</th><th>Perfil</th>
<th>Status</th><th>Criado em</th><th>Ações</th>
</tr>
</thead>
<tbody>
${us.map(u => `
<tr>
<td><strong>${u.nome}</strong></td>
<td>${u.email}</td>

<!-- Perfil -->
<td>
<span class="badge ${u.perfil === 'Administrador' ? 'b-admin' : 'b-atend'}">
${u.perfil}
</span>
</td>

<!-- Status -->
<td>
<span class="badge ${u.ativo ? 'b-on' : 'b-off'}">
${u.ativo ? 'Ativo' : 'Inativo'}
</span>
</td>

<!-- Data -->
<td style="font-size:.73rem;color:var(--muted)">
${new Date(u.createdAt).toLocaleDateString('pt-BR')}
</td>

<!-- Ação -->
<td>
<button class="btn btn-danger btn-sm" onclick="deletarUsuario('${u._id}','${u.nome}')">
🗑️
</button>
</td>
</tr>`).join('')}
</tbody>
</table>`;
} catch (e) {
el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
}
}

// Abre modal de usuário
function abrirUsuario() {
// Limpa campos
['u-nome','u-email','u-senha'].forEach(id =>
document.getElementById(id).value = ''
);

document.getElementById('u-perfil').value = 'Atendente';

abrir('m-usuario');
}

// Salva usuário
async function salvarUsuario() {
const nome = document.getElementById('u-nome').value.trim();
const email = document.getElementById('u-email').value.trim();
const senha = document.getElementById('u-senha').value;

// Validação
if (!nome || !email || !senha) {
toast('Preencha todos os campos', 'err');
return;
}

try {
await api('POST', '/usuarios', {
nome, email, senha,
perfil: document.getElementById('u-perfil').value,
});

toast('Usuário criado!');
fechar('m-usuario');
carregarUsuarios();
} catch (e) {
toast('Erro: ' + e.message, 'err');
}
}

// Deleta usuário
async function deletarUsuario(id, nome) {
if (!confirm(`Deletar "${nome}"?`)) return;

try {
await api('DELETE', '/usuarios/' + id);
toast('Usuário deletado!');
carregarUsuarios();
} catch (e) {
toast('Erro: ' + e.message, 'err');
}
}