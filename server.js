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

// Rota raiz - Documentação da API em HTML estilizado
app.get('/', (req, res) => {
  const htmlDocs = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API da PLUS DELIVERY - Documentação</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f8f9fa;
      }
      h1 {
        color: #0066cc;
        border-bottom: 2px solid #0066cc;
        padding-bottom: 10px;
        margin-bottom: 30px;
      }
      h2 {
        color: #0066cc;
        margin-top: 40px;
        border-left: 4px solid #0066cc;
        padding-left: 10px;
      }
      h3 {
        color: #444;
        margin-top: 25px;
      }
      .endpoint {
        background-color: white;
        border-radius: 5px;
        padding: 20px;
        margin: 20px 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
      }
      .endpoint h3 {
        margin-top: 0;
        color: #0066cc;
      }
      .url {
        background-color: #272822;
        color: #f8f8f2;
        padding: 10px;
        border-radius: 4px;
        font-family: 'Courier New', Courier, monospace;
        overflow-x: auto;
      }
      .method {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 3px;
        font-weight: bold;
        color: white;
        background-color: #28a745;
        margin-right: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th, td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      th {
        background-color: #f1f1f1;
      }
      tr:hover {
        background-color: #f5f5f5;
      }
      .response {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
        border-left: 4px solid #0066cc;
        overflow-x: auto;
      }
      code {
        font-family: 'Courier New', Courier, monospace;
        background-color: #f5f5f5;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 0.9em;
      }
      .curl {
        background-color: #272822;
        color: #f8f8f2;
        padding: 15px;
        border-radius: 4px;
        white-space: pre-wrap;
        overflow-x: auto;
        font-family: 'Courier New', Courier, monospace;
      }
      .auth-info {
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 15px;
        margin: 20px 0;
      }
      .key {
        color: #d63384;
      }
      .value {
        color: #0d6efd;
      }
      .string {
        color: #28a745;
      }
      .number {
        color: #fd7e14;
      }
      .json-response {
        background-color: #272822;
        color: #f8f8f2;
        padding: 15px;
        border-radius: 4px;
        overflow-x: auto;
        font-family: 'Courier New', Courier, monospace;
      }
    </style>
  </head>
  <body>
    <h1>API do Bot Maurício - Backend</h1>
    <p>API para scraping e retorno de pedidos do sistema de delivery.</p>
    <p><strong>Versão:</strong> 1.0.0</p>
    
    <h2>Autenticação</h2>
    <div class="auth-info">
      <p><strong>Tipo:</strong> Header</p>
      <p><strong>Chave:</strong> X-Secret</p>
      <p><strong>Valor:</strong> Chave secreta definida no servidor</p>
      <p><strong>Obrigatório:</strong> Sim, para todas as rotas exceto a documentação (/)</p>
    </div>
    
    <h2>Endpoints</h2>
    
    <div class="endpoint">
      <h3>Listar todos os pedidos</h3>
      <div class="url"><span class="method">GET</span>/api/pedidos?email=seu-email@exemplo.com&senha=sua-senha</div>
      <p>Retorna uma lista com todos os pedidos recentes e seus detalhes.</p>
      
      <h4>Cabeçalhos obrigatórios:</h4>
      <table>
        <tr>
          <th>Nome</th>
          <th>Descrição</th>
        </tr>
        <tr>
          <td>X-Secret</td>
          <td>Chave de autenticação da API</td>
        </tr>
      </table>
      
      <h4>Parâmetros de consulta:</h4>
      <table>
        <tr>
          <th>Nome</th>
          <th>Tipo</th>
          <th>Descrição</th>
        </tr>
        <tr>
          <td>email</td>
          <td>string</td>
          <td>Email de acesso ao sistema de delivery</td>
        </tr>
        <tr>
          <td>senha</td>
          <td>string</td>
          <td>Senha de acesso ao sistema de delivery</td>
        </tr>
      </table>
      
      <h4>Exemplo de requisição:</h4>
      <div class="curl">curl -X GET "http://localhost:3000/api/pedidos?email=seu-email@exemplo.com&senha=sua-senha" -H "X-Secret: sua-chave-secreta"</div>
    </div>
    
    <div class="endpoint">
      <h3>Obter um pedido específico</h3>
      <div class="url"><span class="method">GET</span>/api/pedidos/:id?email=seu-email@exemplo.com&senha=sua-senha</div>
      <p>Retorna os detalhes de um pedido específico pelo ID.</p>
      
      <h4>Cabeçalhos obrigatórios:</h4>
      <table>
        <tr>
          <th>Nome</th>
          <th>Descrição</th>
        </tr>
        <tr>
          <td>X-Secret</td>
          <td>Chave de autenticação da API</td>
        </tr>
      </table>
      
      <h4>Parâmetros de consulta:</h4>
      <table>
        <tr>
          <th>Nome</th>
          <th>Tipo</th>
          <th>Descrição</th>
        </tr>
        <tr>
          <td>id</td>
          <td>string</td>
          <td>ID do pedido a ser consultado (path parameter)</td>
        </tr>
        <tr>
          <td>email</td>
          <td>string</td>
          <td>Email de acesso ao sistema de delivery</td>
        </tr>
        <tr>
          <td>senha</td>
          <td>string</td>
          <td>Senha de acesso ao sistema de delivery</td>
        </tr>
      </table>
      
      <h4>Exemplo de requisição:</h4>
      <div class="curl">curl -X GET "http://localhost:3000/api/pedidos/123456?email=seu-email@exemplo.com&senha=sua-senha" -H "X-Secret: sua-chave-secreta"</div>
    </div>
    
    <h2>Exemplos de respostas</h2>
    
    <h3>Resposta de sucesso</h3>
    <div class="json-response">
[
  {
    <span class="key">"id"</span>: <span class="string">"123456"</span>,
    <span class="key">"cliente"</span>: <span class="string">"Nome do Cliente"</span>,
    <span class="key">"dataHora"</span>: <span class="string">"01/01/2025 12:34"</span>,
    <span class="key">"status"</span>: <span class="string">"Entregue"</span>,
    <span class="key">"detalhes"</span>: <span class="string">"HTML com detalhes do pedido"</span>
  }
]
    </div>
    
    <h3>Resposta de erro</h3>
    <div class="json-response">
{
  <span class="key">"error"</span>: <span class="string">"Não autorizado"</span>,
  <span class="key">"mensagem"</span>: <span class="string">"Cabeçalho X-Secret inválido ou não fornecido"</span>
}
    </div>
    
    <h2>Observações</h2>
    <p>Se email e senha não forem fornecidos na requisição, serão usados os valores do arquivo <code>.env</code>.</p>
    
    <footer style="margin-top: 50px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
      <p>API do Bot Maurício - Versão 1.0.0</p>
    </footer>
  </body>
  </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlDocs);
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 