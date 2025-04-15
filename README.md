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

3. Configure o arquivo `.env` com suas credenciais (opcional, pois também podem ser enviadas na requisição):

```
EMAIL='seu-email@exemplo.com'
SENHA='sua-senha'
PORT=3000
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

## Endpoints da API

### Listar todos os pedidos

```
GET /api/pedidos?email=seu-email@exemplo.com&senha=sua-senha
```

Retorna uma lista com todos os pedidos recentes e seus detalhes.

#### Parâmetros de consulta:

- `email` (string): Email de acesso ao sistema de delivery
- `senha` (string): Senha de acesso ao sistema de delivery

Se email e senha não forem fornecidos na requisição, serão usados os valores do arquivo `.env`.

### Obter um pedido específico

```
GET /api/pedidos/:id?email=seu-email@exemplo.com&senha=sua-senha
```

Retorna os detalhes de um pedido específico pelo ID.

#### Parâmetros de consulta:

- `email` (string): Email de acesso ao sistema de delivery
- `senha` (string): Senha de acesso ao sistema de delivery
- `:id` (string): ID do pedido a ser consultado

Se email e senha não forem fornecidos na requisição, serão usados os valores do arquivo `.env`.

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
