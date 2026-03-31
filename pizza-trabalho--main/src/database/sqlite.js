// ============================================================
// sqlite.js — Conexão com SQLite usando sql.js
// sql.js é SQLite compilado para WebAssembly (puro JS),
// não precisa de Visual Studio nem de compilação nativa.
// ============================================================

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = process.env.DB_PATH
  || path.join(__dirname, '..', '..', 'pizzaria.db');

// Módulo singleton — exporta { db, ready }
// "ready" é uma Promise que resolve quando o banco estiver pronto.
// Todos os models devem aguardar essa Promise antes de usar o db.

const state = { db: null };

const ready = (async () => {
  const SQL = await initSqlJs();

  // Se o arquivo já existe, carrega do disco
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    state.db = new SQL.Database(fileBuffer);
  } else {
    state.db = new SQL.Database();
  }

  const db = state.db;

  // Ativa chaves estrangeiras
  db.run('PRAGMA foreign_keys = ON');

  // ── Criação das tabelas ────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      senha       TEXT    NOT NULL,
      perfil      TEXT    NOT NULL DEFAULT 'Atendente',
      ativo       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      telefone    TEXT    NOT NULL,
      endereco    TEXT    NOT NULL DEFAULT '{}',
      observacoes TEXT    NOT NULL DEFAULT '',
      ativo       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pizzas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nome         TEXT    NOT NULL,
      descricao    TEXT    NOT NULL DEFAULT '',
      ingredientes TEXT    NOT NULL,
      precos       TEXT    NOT NULL DEFAULT '{"P":0,"M":0,"G":0}',
      disponivel   INTEGER NOT NULL DEFAULT 1,
      categoria    TEXT    NOT NULL DEFAULT 'tradicional',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_pedido   INTEGER,
      cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
      subtotal        REAL    NOT NULL DEFAULT 0,
      taxa_entrega    REAL    NOT NULL DEFAULT 0,
      total           REAL    NOT NULL DEFAULT 0,
      forma_pagamento TEXT    NOT NULL,
      troco           REAL    NOT NULL DEFAULT 0,
      status          TEXT    NOT NULL DEFAULT 'recebido',
      observacoes     TEXT    NOT NULL DEFAULT '',
      mesa            INTEGER,
      origem          TEXT    NOT NULL DEFAULT 'balcao',
      garcom_id       INTEGER REFERENCES usuarios(id),
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS itens_pedido (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id      INTEGER NOT NULL REFERENCES pedidos(id),
      pizza_id       INTEGER NOT NULL REFERENCES pizzas(id),
      nome_pizza     TEXT    NOT NULL,
      tamanho        TEXT    NOT NULL,
      quantidade     INTEGER NOT NULL DEFAULT 1,
      preco_unitario REAL    NOT NULL DEFAULT 0,
      subtotal       REAL    NOT NULL DEFAULT 0
    )
  `);

  // Salva no disco após criar as tabelas
  salvar();

  console.log('SQLite (sql.js) conectado:', DB_PATH);
  return db;
})();

// ── Helpers ────────────────────────────────────────────────

// Salva o banco em disco (sql.js é em memória, precisa salvar manualmente)
function salvar() {
  if (!state.db) return;
  const data = state.db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Executa um SELECT e retorna array de objetos
function query(sql, params = []) {
  const stmt    = state.db.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Executa INSERT/UPDATE/DELETE e retorna { lastInsertRowid, changes }
function run(sql, params = []) {
  state.db.run(sql, params);
  const meta = query('SELECT last_insert_rowid() as id, changes() as changes');
  salvar();
  return {
    lastInsertRowid: meta[0]?.id,
    changes:         meta[0]?.changes,
  };
}

// Retorna a primeira linha de um SELECT
function get(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

module.exports = { ready, query, run, get, salvar };
