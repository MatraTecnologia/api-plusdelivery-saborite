# API Bot Maurício - Sistema de Integração com Delivery

Esta API permite automatizar a interação com os sistemas de delivery Plus Delivery e Saborite, possibilitando consultar pedidos, enviar novos pedidos e gerenciar cardápios de forma automatizada via API.

## Índice

- [Visão Geral](#visão-geral)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
  - [Autenticação](#autenticação)
  - [Endpoints](#endpoints)
  - [Exemplos de Requisições](#exemplos-de-requisições)
- [Códigos de Erro](#códigos-de-erro)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Manutenção](#manutenção)

## Visão Geral

Este sistema utiliza automação web com Playwright para interagir com as interfaces do Plus Delivery e Saborite, permitindo:

- Consultar todos os pedidos recentes
- Obter detalhes de pedidos específicos
- Enviar novos pedidos para o sistema
- Consultar cardápios disponíveis

A API é construída com Node.js e Express, utilizando automação com Playwright para acessar as interfaces web dos sistemas de delivery.

## Requisitos

- Node.js 16.x ou superior
- npm ou yarn
- Acesso às credenciais válidas dos sistemas de delivery

## Instalação

1. Clone o repositório:

   ```bash
   git clone [url-do-repositorio]
   cd api-plusdelivery-saborite
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Instale os navegadores necessários para o Playwright:
   ```bash
   npx playwright install chromium
   ```

## Configuração

1. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

   ```
   PORT=3000
   API_SECRET=sua-chave-secreta
   EMAIL=seu-email@exemplo.com
   SENHA=sua-senha
   ```

   - `PORT`: Porta em que o servidor será executado
   - `API_SECRET`: Chave de autenticação para acessar a API
   - `EMAIL`: Email de acesso ao sistema de delivery (opcional, pode ser fornecido em cada requisição)
   - `SENHA`: Senha de acesso ao sistema de delivery (opcional, pode ser fornecida em cada requisição)

## Uso

### Autenticação

Todas as rotas da API (exceto a rota de documentação `/`) exigem autenticação através do cabeçalho `X-Secret`. O valor deste cabeçalho deve corresponder ao `API_SECRET` configurado no arquivo `.env`.

Exemplo:

```
X-Secret: sua-chave-secreta
```

### Endpoints

#### 1. Listar todos os pedidos

```
GET /api/pedidos?email=seu-email@exemplo.com&senha=sua-senha
```

Retorna uma lista com todos os pedidos recentes e seus detalhes.

#### 2. Obter um pedido específico

```
GET /api/pedidos/:id?email=seu-email@exemplo.com&senha=sua-senha
```

Retorna os detalhes de um pedido específico pelo ID.

#### 3. Enviar novo pedido

```
POST /api/enviapedido
```

Envia um novo pedido para o sistema de delivery. Requer um corpo JSON com os detalhes do pedido.

#### 4. Consultar cardápio

```
GET /api/cardapio?email=seu-email@exemplo.com&senha=sua-senha
```

Retorna informações sobre o cardápio disponível.

### Exemplos de Requisições

#### Listar pedidos

```bash
curl -X GET "http://localhost:3000/api/pedidos?email=seu-email@exemplo.com&senha=sua-senha" -H "X-Secret: sua-chave-secreta"
```

#### Enviar pedido

```bash
curl -X POST "http://localhost:3000/api/enviapedido" \
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
  }'
```

## Códigos de Erro

A API utiliza códigos de erro específicos para facilitar a identificação e tratamento de problemas:

| Tipo de Erro                 | Descrição                                    | Código HTTP |
| ---------------------------- | -------------------------------------------- | ----------- |
| ERR_CREDENCIAIS_INVALIDAS    | Credenciais de autenticação inválidas        | 401         |
| ERR_CREDENCIAIS_AUSENTES     | Email e/ou senha não foram fornecidos        | 400         |
| ERR_FALHA_LOGIN              | Falha ao tentar fazer login no sistema       | 401         |
| ERR_FALHA_CONEXAO            | Falha de conexão com o servidor de delivery  | 503         |
| ERR_PEDIDO_NAO_ENCONTRADO    | Pedido com o ID informado não foi encontrado | 404         |
| ERR_TABELA_NAO_ENCONTRADA    | Tabela de pedidos não disponível no momento  | 404         |
| ERR_TIMEOUT                  | Tempo limite excedido durante a operação     | 504         |
| ERR_DETALHES_NAO_ENCONTRADOS | Não foi possível obter os detalhes do pedido | 500         |
| ERR_INTERNO                  | Erro interno do servidor                     | 500         |

## Estrutura do Projeto

```
api-plusdelivery-saborite/
├── routes/                # Rotas da API
│   ├── pedidos.js         # Rota para consulta de pedidos
│   ├── enviapedido.js     # Rota para envio de pedidos
├── .env                   # Arquivo de configuração
├── .gitignore             # Arquivos ignorados pelo git
├── Dockerfile             # Configuração para Docker
├── example-data.json      # Exemplos de dados
├── package.json           # Dependências e scripts
├── server.js              # Ponto de entrada da aplicação
└── README.md              # Documentação
```

## Manutenção

### Execução Local

Para executar o projeto localmente:

```bash
# Modo de desenvolvimento com auto-reload
npm run dev

# Modo de produção
npm start
```

### Execução com Docker

```bash
# Construir a imagem
docker build -t bot-mauricio-api .

# Executar o container
docker run -p 3000:3000 -d --name bot-mauricio bot-mauricio-api
```

---

**Desenvolvido por:** Ryan Varela  
**Empresa:** Matra Tecnologia  
**Proprietário:** Maurício
