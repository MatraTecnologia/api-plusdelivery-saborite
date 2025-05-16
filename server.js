require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pedidosRoutes = require('./routes/pedidos');
const enviapedidoRoutes = require('./routes/enviapedido');
const buscarpedidoRoutes = require('./routes/buscarpedido');
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
app.use('/api/enviapedido', enviapedidoRoutes);
app.use('/api/cardapio', buscarpedidoRoutes);

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
      .author-info {
        background-color: #e6f2ff;
        border-left: 4px solid #0066cc;
        padding: 15px;
        margin: 20px 0;
      }
      footer {
        margin-top: 50px;
        text-align: center;
        border-top: 1px solid #ddd;
        padding-top: 20px;
        font-size: 0.9em;
        color: #666;
      }
    </style>
  </head>
  <body>
    <h1>API do Bot Maurício - Backend</h1>
    <p>API para scraping e retorno de pedidos do sistema de delivery.</p>
    <p><strong>Versão:</strong> 1.0.0</p>
    
    <div class="author-info">
      <h3>Informações do Sistema</h3>
      <p><strong>Proprietário:</strong> Maurício</p>
      <p><strong>Desenvolvido por:</strong> Ryan Varela</p>
      <p><strong>Empresa:</strong> Matra Tecnologia</p>
    </div>
    
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

    <div class="endpoint">
      <h3>Enviar novo pedido</h3>
      <div class="url"><span class="method">POST</span>/api/enviapedido</div>
      <p>Envia um novo pedido para o sistema de delivery.</p>
      
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
        <tr>
          <td>Content-Type</td>
          <td>application/json</td>
        </tr>
      </table>
      
      <h4>Corpo da requisição:</h4>
      <table>
        <tr>
          <th>Campo</th>
          <th>Tipo</th>
          <th>Descrição</th>
          <th>Obrigatório</th>
        </tr>
        <tr>
          <td>nome</td>
          <td>string</td>
          <td>Nome completo do cliente</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>telefone</td>
          <td>string</td>
          <td>Telefone do cliente</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>cep</td>
          <td>string</td>
          <td>CEP do endereço</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>bairro</td>
          <td>string</td>
          <td>Bairro do endereço</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>endereco</td>
          <td>string</td>
          <td>Endereço completo</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>numero</td>
          <td>string</td>
          <td>Número do endereço</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>complemento</td>
          <td>string</td>
          <td>Complemento do endereço</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>pagamento</td>
          <td>string</td>
          <td>Forma de pagamento</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>id_produtos</td>
          <td>array</td>
          <td>Array com IDs dos produtos</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>email</td>
          <td>string</td>
          <td>Email de acesso ao sistema</td>
          <td>Sim</td>
        </tr>
        <tr>
          <td>senha</td>
          <td>string</td>
          <td>Senha de acesso ao sistema</td>
          <td>Sim</td>
        </tr>
      </table>
      
      <h4>Exemplo de requisição:</h4>
      <div class="curl">curl -X POST "http://localhost:3000/api/enviapedido" \
  -H "X-Secret: sua-chave-secreta" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Cliente Teste",
    "telefone": "(27) 99999-9999",
    "cep": "29100-291",
    "bairro": "Centro",
    "endereco": "Rua Teste",
    "numero": "123",
    "complemento": "Apto 101",
    "pagamento": "Dinheiro",
    "id_produtos": ["1", "2", "3"],
    "email": "seu-email@exemplo.com",
    "senha": "sua-senha"
  }'</div>

      <h4>Exemplo de resposta de sucesso:</h4>
      <div class="json-response">
{
  <span class="key">"sucesso"</span>: <span class="string">true</span>,
  <span class="key">"mensagem"</span>: <span class="string">"Pedido enviado com sucesso"</span>,
  <span class="key">"produtos_adicionados"</span>: <span class="number">3</span>
}
      </div>
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
  <span class="key">"tipo"</span>: <span class="string">"ERR_CREDENCIAIS_INVALIDAS"</span>,
  <span class="key">"detalhes"</span>: <span class="string">"Cabeçalho X-Secret inválido ou não fornecido"</span>,
  <span class="key">"codigo"</span>: <span class="number">401</span>
}
    </div>
    
    <h2>Códigos de Erro</h2>
    <p>A API utiliza códigos de erro específicos para facilitar a identificação e tratamento de problemas:</p>
    
    <table>
      <tr>
        <th>Tipo de Erro</th>
        <th>Descrição</th>
        <th>Código HTTP</th>
      </tr>
      <tr>
        <td>ERR_CREDENCIAIS_INVALIDAS</td>
        <td>Credenciais de autenticação inválidas</td>
        <td>401</td>
      </tr>
      <tr>
        <td>ERR_CREDENCIAIS_AUSENTES</td>
        <td>Email e/ou senha não foram fornecidos</td>
        <td>400</td>
      </tr>
      <tr>
        <td>ERR_FALHA_LOGIN</td>
        <td>Falha ao tentar fazer login no sistema</td>
        <td>401</td>
      </tr>
      <tr>
        <td>ERR_FALHA_CONEXAO</td>
        <td>Falha de conexão com o servidor de delivery</td>
        <td>503</td>
      </tr>
      <tr>
        <td>ERR_PEDIDO_NAO_ENCONTRADO</td>
        <td>Pedido com o ID informado não foi encontrado</td>
        <td>404</td>
      </tr>
      <tr>
        <td>ERR_TABELA_NAO_ENCONTRADA</td>
        <td>Tabela de pedidos não disponível no momento</td>
        <td>404</td>
      </tr>
      <tr>
        <td>ERR_TIMEOUT</td>
        <td>Tempo limite excedido durante a operação</td>
        <td>504</td>
      </tr>
      <tr>
        <td>ERR_DETALHES_NAO_ENCONTRADOS</td>
        <td>Não foi possível obter os detalhes do pedido</td>
        <td>500</td>
      </tr>
      <tr>
        <td>ERR_INTERNO</td>
        <td>Erro interno do servidor</td>
        <td>500</td>
      </tr>
    </table>
    
    <h2>Observações</h2>
    <p>Se email e senha não forem fornecidos na requisição, serão usados os valores do arquivo <code>.env</code>.</p>
    
    <footer>
      <p>API do Bot Maurício - Versão 1.0.0</p>
      <p>Desenvolvido por Ryan Varela - Matra Tecnologia</p>
      <p>Proprietário: Maurício</p>
      <p>&copy; ${new Date().getFullYear()} - Todos os direitos reservados</p>
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