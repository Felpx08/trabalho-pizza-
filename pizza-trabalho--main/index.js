// Carrega as variáveis de ambiente do arquivo .env para o objeto process.env
require('dotenv').config()

// Importação de dependências essenciais
const express = require('express') // Framework web para lidar com rotas e middlewares
const cors = require('cors')       // Permite que o front-end acesse a API de diferentes origens
const path = require('path')       // Utilitário nativo do Node para manipular caminhos de arquivos

const app = express()
// Define a porta: usa a variável de ambiente PORT ou 3001 como padrão (fallback)
const PORT = process.env.PORT || 3001

// --- Middlewares ---
app.use(cors())             // Habilita o CORS para segurança de requisições cross-origin
app.use(express.json())     // Permite que o servidor entenda corpos de requisição em formato JSON
// Serve arquivos estáticos (HTML, CSS, JS do front-end) localizados na pasta 'public'
app.use(express.static(path.join(__dirname, 'public')))

// Importação da conexão com o banco de dados e do roteador principal
const { ready } = require('./src/database/sqlite')
const routes = require('./src/routes/index')

// Aguarda a promessa 'ready' (garante que o banco de dados conectou antes de subir o servidor)
ready.then(() => {
  
  // Define o prefixo '/api' para todas as rotas importadas do arquivo de rotas
  app.use('/api', routes)

  // Rota simples de teste para verificar se o backend está respondendo
  app.get('/teste', (req, res) => {
    res.json({ mensagem: 'API da Pizzaria funcionando!', status: 'online', porta: PORT })
  })

  // Middleware Catch-all: Qualquer rota que não seja /api ou /teste retorna o index.html.
  // Essencial para Single Page Applications (SPA) como React ou Vue lidarem com o roteamento.
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
  })

  // Inicializa o servidor na porta configurada
  app.listen(PORT, () => {
    console.log('=================================')
    console.log('Servidor rodando na porta ' + PORT)
    console.log('API: http://localhost:' + PORT + '/api')
    console.log('Front-end: http://localhost:' + PORT)
    console.log('=================================')
  })
}).catch(err => {
  // Caso a conexão com o banco falhe, exibe o erro e encerra o processo
  console.error('Erro ao inicializar banco:', err)
  process.exit(1)
})