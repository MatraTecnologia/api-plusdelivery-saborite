# Bot Maurício - Backend

API para scraping e retorno de pedidos do sistema de delivery.

## Requisitos

- Node.js 18+
- NPM ou Yarn

## Instalação

1. Clone o repositório
2. Instale as dependências:

```bash
npm install
```

3. Configure o arquivo `.env` com suas credenciais e configurações:

```
EMAIL='seu-email@exemplo.com'
SENHA='sua-senha'
PORT=3000
API_SECRET='sua-chave-secreta'
```

## Executando o sistema

Para iniciar o servidor em modo de desenvolvimento:

```bash
npm run dev
```

Para iniciar o servidor em produção:

```bash
npm start
```

## Autenticação

A API utiliza autenticação via cabeçalho `X-Secret`. Todas as requisições (exceto a rota de documentação `/`) devem incluir este cabeçalho com a chave secreta definida na variável de ambiente `API_SECRET`.

Exemplo:

```
X-Secret: sua-chave-secreta
```

## Endpoints da API

### Listar todos os pedidos

```
GET /api/pedidos?email=seu-email@exemplo.com&senha=sua-senha
```

Retorna uma lista com todos os pedidos recentes e seus detalhes.

#### Cabeçalhos obrigatórios:

- `X-Secret`: Chave de autenticação da API

#### Parâmetros de consulta:

- `email` (string): Email de acesso ao sistema de delivery
- `senha` (string): Senha de acesso ao sistema de delivery

Se email e senha não forem fornecidos na requisição, serão usados os valores do arquivo `.env`.

### Obter um pedido específico

```
GET /api/pedidos/:id?email=seu-email@exemplo.com&senha=sua-senha
```

Retorna os detalhes de um pedido específico pelo ID.

#### Cabeçalhos obrigatórios:

- `X-Secret`: Chave de autenticação da API

#### Parâmetros de consulta:

- `email` (string): Email de acesso ao sistema de delivery
- `senha` (string): Senha de acesso ao sistema de delivery
- `:id` (string): ID do pedido a ser consultado

Se email e senha não forem fornecidos na requisição, serão usados os valores do arquivo `.env`.

## Exemplos com cURL

### Listar todos os pedidos:

```bash
curl -X GET "http://localhost:3000/api/pedidos?email=seu-email@exemplo.com&senha=sua-senha" -H "X-Secret: sua-chave-secreta"
```

### Obter um pedido específico:

```bash
curl -X GET "http://localhost:3000/api/pedidos/123456?email=seu-email@exemplo.com&senha=sua-senha" -H "X-Secret: sua-chave-secreta"
```

## Resposta da API

A resposta contém os seguintes campos:

```json
[
  {
    "id": "123456",
    "cliente": "Nome do Cliente",
    "dataHora": "01/01/2025 12:34",
    "status": "Entregue",
    "detalhes": "HTML com detalhes do pedido"
  }
]
```
