require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pedidosRoutes = require('./routes/pedidos');

const app = express();
const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || 'chave-secreta-padrao';

// Middlewares
app.use(express.json());
app.use(cors());

// Middleware para verificar o X-Secret
const verificarSecret = (req, res, next) => {
  const secretHeader = req.headers['x-secret'];
  
  // Rota de documentação não precisa de autenticação
  if (req.path === '/') {
    return next();
  }
  
  if (!secretHeader || secretHeader !== API_SECRET) {
    console.log(`Tentativa de acesso sem X-Secret válido: ${req.path}`);
    return res.status(401).json({ 
      error: 'Não autorizado', 
      mensagem: 'Cabeçalho X-Secret inválido ou não fornecido' 
    });
  }
  
  next();
};

// Aplicar middleware de verificação
app.use(verificarSecret);

// Rotas
app.use('/api/pedidos', pedidosRoutes);

// Rota raiz - Documentação da API
app.get('/', (req, res) => {
  res.json({ 
    nome: 'API do Bot Maurício - Backend',
    descricao: 'API para scraping e retorno de pedidos do sistema de delivery.',
    versao: '1.0.0',
    autenticacao: {
      tipo: 'Header',
      chave: 'X-Secret',
      valor: 'Chave secreta definida no servidor',
      obrigatorio: 'Sim, para todas as rotas exceto a documentação (/)' 
    },
    endpoints: {
      listarPedidos: {
        url: '/api/pedidos',
        metodo: 'GET',
        descricao: 'Retorna uma lista com todos os pedidos recentes e seus detalhes.',
        parametros: {
          email: 'Email de acesso ao sistema de delivery (query string)',
          senha: 'Senha de acesso ao sistema de delivery (query string)'
        },
        headers: {
          'X-Secret': 'Chave de autenticação da API'
        },
        exemplo: '/api/pedidos?email=seu-email@exemplo.com&senha=sua-senha'
      },
      obterPedido: {
        url: '/api/pedidos/:id',
        metodo: 'GET',
        descricao: 'Retorna os detalhes de um pedido específico pelo ID.',
        parametros: {
          id: 'ID do pedido a ser consultado (path parameter)',
          email: 'Email de acesso ao sistema de delivery (query string)',
          senha: 'Senha de acesso ao sistema de delivery (query string)'
        },
        headers: {
          'X-Secret': 'Chave de autenticação da API'
        },
        exemplo: '/api/pedidos/123456?email=seu-email@exemplo.com&senha=sua-senha'
      }
    },
    exemploRequisicao: {
      curl: 'curl -X GET "http://localhost:3000/api/pedidos?email=seu-email@exemplo.com&senha=sua-senha" -H "X-Secret: sua-chave-secreta"'
    },
    respostaExemplo: [
      {
        id: "123456",
        cliente: "Nome do Cliente",
        dataHora: "01/01/2025 12:34",
        status: "Entregue",
        detalhes: "HTML com detalhes do pedido"
      }
    ],
    observacoes: 'Se email e senha não forem fornecidos na requisição, serão usados os valores do arquivo .env.'
  });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 