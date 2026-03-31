const express  = require('express');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const auth     = require('../middlewares/auth');

const Usuario  = require('../models/Usuario');
const Pizza    = require('../models/Pizza');
const Cliente  = require('../models/Cliente');
const Pedido   = require('../models/Pedido');

router.post('/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });

    const usuario = await Usuario.findByEmail(email);
    if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const ok = await Usuario.verificarSenha(senha, usuario.senha);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil } });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/pizzas', auth, async (req, res) => {
  try { res.json(await Pizza.findAll()); }
  catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/pizzas/:id', auth, async (req, res) => {
  try {
    const p = await Pizza.findById(req.params.id);
    if (!p) return res.status(404).json({ erro: 'Pizza não encontrada' });
    res.json(p);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/pizzas', auth, async (req, res) => {
  try {
    if (!req.body.nome || !req.body.ingredientes)
      return res.status(400).json({ erro: 'Nome e ingredientes são obrigatórios' });
    res.status(201).json(await Pizza.create(req.body));
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/pizzas/:id', auth, async (req, res) => {
  try {
    const p = await Pizza.update(req.params.id, req.body);
    if (!p) return res.status(404).json({ erro: 'Pizza não encontrada' });
    res.json(p);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/pizzas/:id', auth, async (req, res) => {
  try {
    const ok = await Pizza.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Pizza não encontrada' });
    res.json({ mensagem: 'Pizza deletada' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/clientes', auth, async (req, res) => {
  try { res.json(await Cliente.findAll(req.query.busca)); }
  catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/clientes/:id', auth, async (req, res) => {
  try {
    const c = await Cliente.findById(req.params.id);
    if (!c) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(c);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/clientes', auth, async (req, res) => {
  try {
    if (!req.body.nome || !req.body.telefone)
      return res.status(400).json({ erro: 'Nome e telefone são obrigatórios' });
    res.status(201).json(await Cliente.create(req.body));
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/clientes/:id', auth, async (req, res) => {
  try {
    const c = await Cliente.update(req.params.id, req.body);
    if (!c) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(c);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/clientes/:id', auth, async (req, res) => {
  try {
    const ok = await Cliente.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json({ mensagem: 'Cliente deletado' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/pedidos', auth, async (req, res) => {
  try {
    const filtros = {};
    if (req.query.garcom) filtros.garcomId = req.query.garcom;
    res.json(await Pedido.findAll(filtros));
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/pedidos/:id', auth, async (req, res) => {
  try {
    const p = await Pedido.findById(req.params.id);
    if (!p) return res.status(404).json({ erro: 'Pedido não encontrado' });
    res.json(p);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/pedidos', auth, async (req, res) => {
  try {
    const { cliente, itens, formaPagamento } = req.body;
    if (!cliente || !itens?.length || !formaPagamento)
      return res.status(400).json({ erro: 'cliente, itens e formaPagamento são obrigatórios' });

    const novo = await Pedido.create({
      clienteId:      cliente,
      itens,
      taxaEntrega:    req.body.taxaEntrega,
      formaPagamento,
      troco:          req.body.troco,
      observacoes:    req.body.observacoes,
      mesa:           req.body.mesa,
      origem:         req.body.origem,
      garcomId:       req.body.garcom || req.usuario?.id,
    });
    res.status(201).json(novo);
  } catch (e) { res.status(400).json({ erro: e.message }); }
});

router.patch('/pedidos/:id/status', auth, async (req, res) => {
  try {
    const validos = ['recebido','em_preparo','saiu_entrega','entregue','cancelado'];
    if (!validos.includes(req.body.status))
      return res.status(400).json({ erro: 'Status inválido' });
    const p = await Pedido.updateStatus(req.params.id, req.body.status);
    if (!p) return res.status(404).json({ erro: 'Pedido não encontrado' });
    res.json(p);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/pedidos/:id', auth, async (req, res) => {
  try {
    const ok = await Pedido.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Pedido não encontrado' });
    res.json({ mensagem: 'Pedido deletado' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/usuarios', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    res.json(await Usuario.findAll());
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/usuarios', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha)
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    res.status(201).json(await Usuario.create({ nome, email, senha, perfil }));
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(400).json({ erro: 'E-mail já cadastrado' });
    res.status(500).json({ erro: e.message });
  }
});

router.put('/usuarios/:id', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    const u = await Usuario.update(req.params.id, req.body);
    if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(u);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/usuarios/:id', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    const ok = await Usuario.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: 'Usuário deletado' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
