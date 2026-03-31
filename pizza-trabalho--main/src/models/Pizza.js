// ============================================================
// Pizza.js — Model de Pizza (sql.js)
// ============================================================

const { ready, query, run, get } = require('../database/sqlite');

function formatarPizza(row) {
  if (!row) return null;
  return {
    _id:         row.id,
    id:          row.id,
    nome:        row.nome,
    descricao:   row.descricao,
    ingredientes: row.ingredientes,
    precos:      JSON.parse(row.precos || '{"P":0,"M":0,"G":0}'),
    disponivel:  row.disponivel === 1,
    categoria:   row.categoria,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

const Pizza = {

  async findAll() {
    await ready;
    return query('SELECT * FROM pizzas ORDER BY categoria, nome').map(formatarPizza);
  },

  async findById(id) {
    await ready;
    return formatarPizza(get('SELECT * FROM pizzas WHERE id = ?', [id]));
  },

  async create({ nome, descricao = '', ingredientes, precos = {}, disponivel = true, categoria = 'tradicional' }) {
    await ready;
    const info = run(
      'INSERT INTO pizzas (nome, descricao, ingredientes, precos, disponivel, categoria) VALUES (?, ?, ?, ?, ?, ?)',
      [nome.trim(), descricao.trim(), ingredientes.trim(),
       JSON.stringify({ P: precos.P || 0, M: precos.M || 0, G: precos.G || 0 }),
       disponivel ? 1 : 0, categoria]
    );
    return this.findById(info.lastInsertRowid);
  },

  async update(id, { nome, descricao, ingredientes, precos, disponivel, categoria }) {
    await ready;
    const atual = get('SELECT * FROM pizzas WHERE id = ?', [id]);
    if (!atual) return null;

    const precosAtuais = JSON.parse(atual.precos || '{"P":0,"M":0,"G":0}');
    const precosFinal  = precos
      ? { P: precos.P ?? precosAtuais.P, M: precos.M ?? precosAtuais.M, G: precos.G ?? precosAtuais.G }
      : precosAtuais;

    run(`
      UPDATE pizzas SET
        nome         = ?,
        descricao    = ?,
        ingredientes = ?,
        precos       = ?,
        disponivel   = ?,
        categoria    = ?,
        updated_at   = datetime('now')
      WHERE id = ?
    `, [
      nome         ?? atual.nome,
      descricao    ?? atual.descricao,
      ingredientes ?? atual.ingredientes,
      JSON.stringify(precosFinal),
      disponivel   !== undefined ? (disponivel ? 1 : 0) : atual.disponivel,
      categoria    ?? atual.categoria,
      id
    ]);

    return this.findById(id);
  },

  async delete(id) {
    await ready;
    const info = run('DELETE FROM pizzas WHERE id = ?', [id]);
    return info.changes > 0;
  },
};

module.exports = Pizza;
