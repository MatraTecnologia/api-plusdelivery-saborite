const express = require('express');
const { chromium } = require('playwright');
const router = express.Router();

// Tipos de erro para facilitar a identificação de problemas
const TIPOS_ERRO = {
  CREDENCIAIS_INVALIDAS: 'ERR_CREDENCIAIS_INVALIDAS',
  CREDENCIAIS_AUSENTES: 'ERR_CREDENCIAIS_AUSENTES',
  FALHA_LOGIN: 'ERR_FALHA_LOGIN',
  FALHA_CONEXAO: 'ERR_FALHA_CONEXAO',
  PEDIDO_NAO_ENCONTRADO: 'ERR_PEDIDO_NAO_ENCONTRADO',
  TABELA_NAO_ENCONTRADA: 'ERR_TABELA_NAO_ENCONTRADA',
  TIMEOUT: 'ERR_TIMEOUT',
  DETALHES_NAO_ENCONTRADOS: 'ERR_DETALHES_NAO_ENCONTRADOS',
  ERRO_INTERNO: 'ERR_INTERNO'
};

// Rota para obter todos os pedidos
router.get('/', async (req, res) => {
  try {
    // Obter credenciais da requisição ou usar valores do .env como fallback
    const email = req.query.email || process.env.EMAIL || '';
    const senha = req.query.senha || process.env.SENHA || '';

    console.log(`[GET /api/pedidos] Iniciando com email: ${email}`);

    if (!email || !senha) {
      console.log('[GET /api/pedidos] Erro: Email ou senha não fornecidos');
      return res.status(400).json({ 
        error: 'Credenciais ausentes',
        tipo: TIPOS_ERRO.CREDENCIAIS_AUSENTES,
        detalhes: 'Email e senha são obrigatórios para acessar esta rota',
        codigo: 400
      });
    }

    console.log("[GET /api/pedidos] Iniciando a busca por pedidos...");
    
    console.log("[GET /api/pedidos] Iniciando navegador...");
    try {
      var browser = await chromium.launch({ headless: true });
      var page = await browser.newPage();
    } catch (error) {
      console.error("[GET /api/pedidos] Erro ao iniciar o navegador:", error);
      return res.status(500).json({
        error: 'Falha ao iniciar o navegador',
        tipo: TIPOS_ERRO.FALHA_CONEXAO,
        detalhes: error.message,
        codigo: 500
      });
    }

    // Realizando o login com as credenciais recebidas
    console.log("[GET /api/pedidos] Navegando para a página de login...");
    try {
      await page.goto('https://minhaloja.plusdelivery.com.br/admin/login/');
    } catch (error) {
      console.error("[GET /api/pedidos] Erro ao acessar página de login:", error);
      await browser.close();
      return res.status(503).json({
        error: 'Falha ao acessar o site',
        tipo: TIPOS_ERRO.FALHA_CONEXAO,
        detalhes: 'Não foi possível acessar o site de delivery',
        codigo: 503
      });
    }
    
    console.log("[GET /api/pedidos] Preenchendo credenciais...");
    await page.fill('#login', email);
    await page.fill('#senha', senha);
    
    console.log("[GET /api/pedidos] Clicando no botão de login...");
    await page.click('.btn.btn-lg.btn-success.btn-block');

    // Esperar a página carregar completamente após o login
    console.log("[GET /api/pedidos] Aguardando carregamento após login...");
    try {
      await page.waitForSelector('.navbar-brand', { timeout: 15000 });
      const count = await page.locator('.navbar-brand').count();
      
      console.log(`[GET /api/pedidos] Elementos navbar-brand encontrados: ${count}`);
      if (count === 0) {
        console.log('[GET /api/pedidos] Falha no login ou o seletor não foi encontrado.');
        await browser.close();
        return res.status(401).json({ 
          error: 'Falha no login', 
          tipo: TIPOS_ERRO.FALHA_LOGIN,
          detalhes: 'Credenciais inválidas ou problema no site',
          codigo: 401
        });
      }
    } catch (error) {
      console.error("[GET /api/pedidos] Timeout ao esperar pelo login:", error);
      await browser.close();
      return res.status(401).json({ 
        error: 'Timeout no login', 
        tipo: TIPOS_ERRO.TIMEOUT,
        detalhes: 'Tempo limite excedido ao fazer login',
        codigo: 401
      });
    }

    console.log('[GET /api/pedidos] Login bem-sucedido!');

    // Aguardar carregamento da tabela
    console.log('[GET /api/pedidos] Aguardando 5 segundos para carregar a tabela...');
    await page.waitForTimeout(5000);

    // Verificar se a tabela de pedidos existe
    const tabelaExiste = await page.locator('#listaPedidos').count();
    console.log(`[GET /api/pedidos] Tabela de pedidos encontrada: ${tabelaExiste > 0 ? 'Sim' : 'Não'}`);
    
    if (tabelaExiste === 0) {
      console.log('[GET /api/pedidos] Tabela de pedidos não encontrada');
      await browser.close();
      return res.status(404).json({ 
        error: 'Tabela de pedidos não encontrada', 
        tipo: TIPOS_ERRO.TABELA_NAO_ENCONTRADA,
        detalhes: 'A tabela de pedidos não está disponível no momento',
        codigo: 404
      });
    }

    // Verificar se existem linhas na tabela
    const linhasTabela = await page.locator('#listaPedidos tr').count();
    console.log(`[GET /api/pedidos] Número de linhas na tabela: ${linhasTabela}`);

    // Coletar os pedidos da tabela
    console.log('[GET /api/pedidos] Coletando pedidos da tabela...');
    const pedidos = await page.$$eval('#listaPedidos tr', (rows) => {
      const pedidosArray = [];
      for (const row of rows) {
        const cols = row.querySelectorAll('td');
        if (cols.length > 0) {
          const pedido = {
            id: cols[0]?.innerText.trim().replace('# ', ''),
            cliente: cols[1]?.innerText.trim(),
            dataHora: cols[2]?.innerText.trim(),
            status: cols[3]?.innerText.trim() || null,
            detalhes: null,
          };

          pedidosArray.push(pedido);
        }
      }
      return pedidosArray;
    });

    console.log(`[GET /api/pedidos] Pedidos encontrados: ${pedidos.length}`);
    
    if (pedidos.length === 0) {
      console.log('[GET /api/pedidos] Nenhum pedido encontrado');
      await browser.close();
      return res.json({
        pedidos: [],
        mensagem: 'Nenhum pedido encontrado para este usuário',
        total: 0
      });
    }

    // Limitar os pedidos para apenas os 10 primeiros
    const pedidosLimitados = pedidos.slice(0, 10);
    console.log(`[GET /api/pedidos] Pedidos limitados: ${pedidosLimitados.length}`);
    
    // Array para armazenar os pedidos com detalhes
    const pedidosCompletos = [];

    for (const pedido of pedidosLimitados) {
      console.log(`[GET /api/pedidos] Coletando detalhes para o pedido #${pedido.id}`);
      
      // Verificar se o botão de detalhes existe
      const botaoDetalheExiste = await page.locator(`#btnDetalhePedido[identificacao="${pedido.id}"]`).count();
      console.log(`[GET /api/pedidos] Botão de detalhes para pedido #${pedido.id} existe: ${botaoDetalheExiste > 0 ? 'Sim' : 'Não'}`);
      
      if (botaoDetalheExiste === 0) {
        console.log(`[GET /api/pedidos] Botão de detalhes não encontrado para pedido #${pedido.id}`);
        pedidosCompletos.push({
          ...pedido,
          detalhes: null,
          erro: {
            mensagem: 'Detalhes não disponíveis',
            tipo: TIPOS_ERRO.DETALHES_NAO_ENCONTRADOS
          }
        });
        continue;
      }
      
      // Clica na linha do pedido usando o identificador
      console.log(`[GET /api/pedidos] Clicando no botão de detalhes do pedido #${pedido.id}...`);
      const linhaPedido = await page.locator(`#btnDetalhePedido[identificacao="${pedido.id}"]`);
      await linhaPedido.click();
      
      console.log(`[GET /api/pedidos] Aguardando 2 segundos após clicar no pedido #${pedido.id}...`);
      await page.waitForTimeout(2000);
      
      // Espera a visualização detalhada carregar
      console.log(`[GET /api/pedidos] Aguardando seletor .ta_visualizar_pedido para pedido #${pedido.id}...`);
      
      try {
        await page.waitForSelector('.ta_visualizar_pedido', { timeout: 10000 });
        console.log(`[GET /api/pedidos] Seletor .ta_visualizar_pedido encontrado para pedido #${pedido.id}`);

        // Coleta os dados do painel de detalhes
        console.log(`[GET /api/pedidos] Coletando HTML dos detalhes do pedido #${pedido.id}...`);
        const detalhes = await page.$eval('.ta_visualizar_pedido', (div) => {
          return div.innerHTML.trim();
        });

        // Cria um novo objeto de pedido com os detalhes
        const pedidoCompleto = {
          id: pedido.id,
          cliente: pedido.cliente,
          dataHora: pedido.dataHora,
          status: pedido.status,
          detalhes: detalhes
        };

        console.log(`[GET /api/pedidos] Detalhes coletados para pedido #${pedido.id}`);
        pedidosCompletos.push(pedidoCompleto);
      } catch (error) {
        console.error(`[GET /api/pedidos] Erro ao coletar detalhes do pedido #${pedido.id}:`, error);
        pedidosCompletos.push({
          ...pedido,
          detalhes: null,
          erro: {
            mensagem: 'Erro ao coletar detalhes',
            tipo: TIPOS_ERRO.DETALHES_NAO_ENCONTRADOS,
            detalhes: error.message
          }
        });
      }

      // Aguarda antes de continuar para o próximo pedido
      console.log(`[GET /api/pedidos] Aguardando 1 segundo antes de passar para o próximo pedido...`);
      await page.waitForTimeout(1000);
    }

    console.log(`[GET /api/pedidos] Fechando navegador...`);
    await browser.close();
    
    // Retorna os pedidos com detalhes
    console.log(`[GET /api/pedidos] Retornando ${pedidosCompletos.length} pedidos completos`);
    return res.json({
      pedidos: pedidosCompletos,
      total: pedidosCompletos.length,
      sucesso: true
    });
  } catch (error) {
    console.error('[GET /api/pedidos] Erro ao coletar os pedidos:', error);
    
    // Determinar o tipo de erro com base na mensagem
    let tipoErro = TIPOS_ERRO.ERRO_INTERNO;
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      tipoErro = TIPOS_ERRO.TIMEOUT;
      statusCode = 504;
    } else if (error.message.includes('net::') || error.message.includes('Navigation')) {
      tipoErro = TIPOS_ERRO.FALHA_CONEXAO;
      statusCode = 503;
    }
    
    return res.status(statusCode).json({ 
      error: 'Falha ao coletar os pedidos', 
      tipo: tipoErro,
      detalhes: error.message,
      codigo: statusCode
    });
  }
});

// Rota para obter um pedido específico por ID
router.get('/:id', async (req, res) => {
  try {
    // Obter credenciais da requisição ou usar valores do .env como fallback
    const email = req.query.email || process.env.EMAIL || '';
    const senha = req.query.senha || process.env.SENHA || '';
    const pedidoId = req.params.id;

    console.log(`[GET /api/pedidos/${pedidoId}] Iniciando com email: ${email}`);

    if (!email || !senha) {
      console.log(`[GET /api/pedidos/${pedidoId}] Erro: Email ou senha não fornecidos`);
      return res.status(400).json({ 
        error: 'Credenciais ausentes', 
        tipo: TIPOS_ERRO.CREDENCIAIS_AUSENTES,
        detalhes: 'Email e senha são obrigatórios para acessar esta rota',
        codigo: 400
      });
    }

    if (!pedidoId || pedidoId.trim() === '') {
      console.log(`[GET /api/pedidos/${pedidoId}] ID do pedido inválido`);
      return res.status(400).json({
        error: 'ID de pedido inválido',
        tipo: TIPOS_ERRO.PEDIDO_NAO_ENCONTRADO,
        detalhes: 'O ID do pedido não pode estar vazio',
        codigo: 400
      });
    }

    console.log(`[GET /api/pedidos/${pedidoId}] Buscando pedido #${pedidoId}...`);
    
    console.log(`[GET /api/pedidos/${pedidoId}] Iniciando navegador...`);
    try {
      var browser = await chromium.launch({ headless: true });
      var page = await browser.newPage();
    } catch (error) {
      console.error(`[GET /api/pedidos/${pedidoId}] Erro ao iniciar o navegador:`, error);
      return res.status(500).json({
        error: 'Falha ao iniciar o navegador',
        tipo: TIPOS_ERRO.FALHA_CONEXAO,
        detalhes: error.message,
        codigo: 500
      });
    }

    // Realizando o login com as credenciais recebidas
    console.log(`[GET /api/pedidos/${pedidoId}] Navegando para a página de login...`);
    try {
      await page.goto('https://minhaloja.plusdelivery.com.br/admin/login/');
    } catch (error) {
      console.error(`[GET /api/pedidos/${pedidoId}] Erro ao acessar página de login:`, error);
      await browser.close();
      return res.status(503).json({
        error: 'Falha ao acessar o site',
        tipo: TIPOS_ERRO.FALHA_CONEXAO,
        detalhes: 'Não foi possível acessar o site de delivery',
        codigo: 503
      });
    }
    
    console.log(`[GET /api/pedidos/${pedidoId}] Preenchendo credenciais...`);
    await page.fill('#login', email);
    await page.fill('#senha', senha);
    
    console.log(`[GET /api/pedidos/${pedidoId}] Clicando no botão de login...`);
    await page.click('.btn.btn-lg.btn-success.btn-block');

    // Esperar a página carregar
    console.log(`[GET /api/pedidos/${pedidoId}] Aguardando carregamento após login...`);
    try {
      await page.waitForSelector('.navbar-brand', { timeout: 15000 });
      const loginSuccess = await page.locator('.navbar-brand').count() > 0;
      
      if (!loginSuccess) {
        console.log(`[GET /api/pedidos/${pedidoId}] Falha no login - seletor não encontrado`);
        await browser.close();
        return res.status(401).json({ 
          error: 'Falha no login', 
          tipo: TIPOS_ERRO.FALHA_LOGIN,
          detalhes: 'Credenciais inválidas ou problema no site',
          codigo: 401
        });
      }
    } catch (error) {
      console.log(`[GET /api/pedidos/${pedidoId}] Timeout ao esperar pelo login`);
      await browser.close();
      return res.status(401).json({ 
        error: 'Timeout no login', 
        tipo: TIPOS_ERRO.TIMEOUT,
        detalhes: 'Tempo limite excedido ao fazer login',
        codigo: 401
      });
    }
    
    // Aguardar carregamento da tabela
    console.log(`[GET /api/pedidos/${pedidoId}] Aguardando 5 segundos para carregar a tabela...`);
    await page.waitForTimeout(5000);

    // Verificar se a tabela existe
    const tabelaExiste = await page.locator('#listaPedidos').count();
    console.log(`[GET /api/pedidos/${pedidoId}] Tabela de pedidos encontrada: ${tabelaExiste > 0 ? 'Sim' : 'Não'}`);
    
    if (tabelaExiste === 0) {
      console.log(`[GET /api/pedidos/${pedidoId}] Tabela de pedidos não encontrada`);
      await browser.close();
      return res.status(404).json({ 
        error: 'Tabela de pedidos não encontrada', 
        tipo: TIPOS_ERRO.TABELA_NAO_ENCONTRADA,
        detalhes: 'A tabela de pedidos não está disponível no momento',
        codigo: 404
      });
    }

    // Verificar se o pedido existe
    console.log(`[GET /api/pedidos/${pedidoId}] Verificando se o pedido #${pedidoId} existe...`);
    const pedidoExiste = await page.locator(`#btnDetalhePedido[identificacao="${pedidoId}"]`).count();
    console.log(`[GET /api/pedidos/${pedidoId}] Pedido #${pedidoId} existe: ${pedidoExiste > 0 ? 'Sim' : 'Não'}`);
    
    if (pedidoExiste === 0) {
      console.log(`[GET /api/pedidos/${pedidoId}] Pedido #${pedidoId} não encontrado`);
      await browser.close();
      return res.status(404).json({ 
        error: 'Pedido não encontrado', 
        tipo: TIPOS_ERRO.PEDIDO_NAO_ENCONTRADO,
        detalhes: `O pedido com ID ${pedidoId} não foi encontrado no sistema`,
        codigo: 404
      });
    }

    // Clica no pedido específico
    console.log(`[GET /api/pedidos/${pedidoId}] Clicando no botão de detalhes do pedido #${pedidoId}...`);
    await page.locator(`#btnDetalhePedido[identificacao="${pedidoId}"]`).click();
    
    console.log(`[GET /api/pedidos/${pedidoId}] Aguardando 2 segundos após clicar no pedido #${pedidoId}...`);
    await page.waitForTimeout(2000);
    
    // Espera a visualização detalhada carregar
    console.log(`[GET /api/pedidos/${pedidoId}] Aguardando seletor .ta_visualizar_pedido para pedido #${pedidoId}...`);
    
    try {
      await page.waitForSelector('.ta_visualizar_pedido', { timeout: 10000 });
      console.log(`[GET /api/pedidos/${pedidoId}] Seletor .ta_visualizar_pedido encontrado para pedido #${pedidoId}`);

      // Coleta as informações básicas do pedido
      console.log(`[GET /api/pedidos/${pedidoId}] Coletando informações básicas do pedido #${pedidoId}...`);
      const infoPedido = await page.$$eval('#listaPedidos tr', (rows, id) => {
        for (const row of rows) {
          const cols = row.querySelectorAll('td');
          if (cols.length > 0 && cols[0]?.innerText.trim().replace('# ', '') === id) {
            return {
              id: cols[0]?.innerText.trim().replace('# ', ''),
              cliente: cols[1]?.innerText.trim(),
              dataHora: cols[2]?.innerText.trim(),
              status: cols[3]?.innerText.trim() || null,
            };
          }
        }
        return null;
      }, pedidoId);

      console.log(`[GET /api/pedidos/${pedidoId}] Informações básicas coletadas:`, infoPedido);

      if (!infoPedido) {
        console.log(`[GET /api/pedidos/${pedidoId}] Informações básicas não encontradas para o pedido #${pedidoId}`);
        await browser.close();
        return res.status(404).json({ 
          error: 'Informações do pedido não encontradas', 
          tipo: TIPOS_ERRO.PEDIDO_NAO_ENCONTRADO,
          detalhes: `Não foi possível obter informações para o pedido ${pedidoId}`,
          codigo: 404
        });
      }

      // Coleta os detalhes
      console.log(`[GET /api/pedidos/${pedidoId}] Coletando HTML dos detalhes do pedido #${pedidoId}...`);
      const detalhes = await page.$eval('.ta_visualizar_pedido', (div) => {
        return div.innerHTML.trim();
      });

      // Cria o objeto completo do pedido
      const pedidoCompleto = {
        ...infoPedido,
        detalhes: detalhes,
        sucesso: true
      };

      console.log(`[GET /api/pedidos/${pedidoId}] Fechando navegador...`);
      await browser.close();
      
      console.log(`[GET /api/pedidos/${pedidoId}] Retornando detalhes do pedido #${pedidoId}`);
      return res.json(pedidoCompleto);
    } catch (error) {
      console.error(`[GET /api/pedidos/${pedidoId}] Erro ao coletar detalhes:`, error);
      await browser.close();
      return res.status(500).json({ 
        error: 'Falha ao coletar detalhes do pedido', 
        tipo: TIPOS_ERRO.DETALHES_NAO_ENCONTRADOS,
        detalhes: error.message,
        codigo: 500
      });
    }
  } catch (error) {
    console.error(`[GET /api/pedidos/${req.params.id}] Erro ao buscar o pedido:`, error);
    
    // Determinar o tipo de erro com base na mensagem
    let tipoErro = TIPOS_ERRO.ERRO_INTERNO;
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      tipoErro = TIPOS_ERRO.TIMEOUT;
      statusCode = 504;
    } else if (error.message.includes('net::') || error.message.includes('Navigation')) {
      tipoErro = TIPOS_ERRO.FALHA_CONEXAO;
      statusCode = 503;
    }
    
    return res.status(statusCode).json({ 
      error: 'Falha ao buscar o pedido', 
      tipo: tipoErro,
      detalhes: error.message,
      codigo: statusCode
    });
  }
});

module.exports = router; 