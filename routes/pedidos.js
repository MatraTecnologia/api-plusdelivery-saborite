const express = require('express');
const { chromium } = require('playwright');
const router = express.Router();

// Rota para obter todos os pedidos
router.get('/', async (req, res) => {
  try {
    // Obter credenciais da requisição ou usar valores do .env como fallback
    const email = req.query.email || process.env.EMAIL || '';
    const senha = req.query.senha || process.env.SENHA || '';

    console.log(`[GET /api/pedidos] Iniciando com email: ${email}`);

    if (!email || !senha) {
      console.log('[GET /api/pedidos] Erro: Email ou senha não fornecidos');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    console.log("[GET /api/pedidos] Iniciando a busca por pedidos...");
    
    console.log("[GET /api/pedidos] Iniciando navegador...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Realizando o login com as credenciais recebidas
    console.log("[GET /api/pedidos] Navegando para a página de login...");
    await page.goto('https://minhaloja.plusdelivery.com.br/admin/login/');
    
    console.log("[GET /api/pedidos] Preenchendo credenciais...");
    await page.fill('#login', email);
    await page.fill('#senha', senha);
    
    console.log("[GET /api/pedidos] Clicando no botão de login...");
    await page.click('.btn.btn-lg.btn-success.btn-block');

    // Esperar a página carregar completamente após o login
    console.log("[GET /api/pedidos] Aguardando carregamento após login...");
    await page.waitForSelector('.navbar-brand');
    const count = await page.locator('.navbar-brand').count();
    
    console.log(`[GET /api/pedidos] Elementos navbar-brand encontrados: ${count}`);
    if (count > 0) {
      console.log('[GET /api/pedidos] Login bem-sucedido!');
    } else {
      console.log('[GET /api/pedidos] Falha no login ou o seletor não foi encontrado.');
      await browser.close();
      return res.status(400).json({ error: 'Falha no login' });
    }

    // Aguardar carregamento da tabela
    console.log('[GET /api/pedidos] Aguardando 5 segundos para carregar a tabela...');
    await page.waitForTimeout(5000);

    // Verificar se a tabela de pedidos existe
    const tabelaExiste = await page.locator('#listaPedidos').count();
    console.log(`[GET /api/pedidos] Tabela de pedidos encontrada: ${tabelaExiste > 0 ? 'Sim' : 'Não'}`);
    
    if (tabelaExiste === 0) {
      console.log('[GET /api/pedidos] Tabela de pedidos não encontrada');
      await browser.close();
      return res.status(404).json({ error: 'Tabela de pedidos não encontrada' });
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
      return res.json([]);
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
          detalhes: "Detalhes não disponíveis"
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
          detalhes: "Erro ao coletar detalhes"
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
    return res.json(pedidosCompletos);
  } catch (error) {
    console.error('[GET /api/pedidos] Erro ao coletar os pedidos:', error);
    return res.status(500).json({ error: 'Falha ao coletar os pedidos', mensagem: error.message });
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
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    console.log(`[GET /api/pedidos/${pedidoId}] Buscando pedido #${pedidoId}...`);
    
    console.log(`[GET /api/pedidos/${pedidoId}] Iniciando navegador...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Realizando o login com as credenciais recebidas
    console.log(`[GET /api/pedidos/${pedidoId}] Navegando para a página de login...`);
    await page.goto('https://minhaloja.plusdelivery.com.br/admin/login/');
    
    console.log(`[GET /api/pedidos/${pedidoId}] Preenchendo credenciais...`);
    await page.fill('#login', email);
    await page.fill('#senha', senha);
    
    console.log(`[GET /api/pedidos/${pedidoId}] Clicando no botão de login...`);
    await page.click('.btn.btn-lg.btn-success.btn-block');

    // Esperar a página carregar
    console.log(`[GET /api/pedidos/${pedidoId}] Aguardando carregamento após login...`);
    await page.waitForSelector('.navbar-brand');
    
    // Aguardar carregamento da tabela
    console.log(`[GET /api/pedidos/${pedidoId}] Aguardando 5 segundos para carregar a tabela...`);
    await page.waitForTimeout(5000);

    // Verificar se a tabela existe
    const tabelaExiste = await page.locator('#listaPedidos').count();
    console.log(`[GET /api/pedidos/${pedidoId}] Tabela de pedidos encontrada: ${tabelaExiste > 0 ? 'Sim' : 'Não'}`);
    
    if (tabelaExiste === 0) {
      console.log(`[GET /api/pedidos/${pedidoId}] Tabela de pedidos não encontrada`);
      await browser.close();
      return res.status(404).json({ error: 'Tabela de pedidos não encontrada' });
    }

    // Verificar se o pedido existe
    console.log(`[GET /api/pedidos/${pedidoId}] Verificando se o pedido #${pedidoId} existe...`);
    const pedidoExiste = await page.locator(`#btnDetalhePedido[identificacao="${pedidoId}"]`).count();
    console.log(`[GET /api/pedidos/${pedidoId}] Pedido #${pedidoId} existe: ${pedidoExiste > 0 ? 'Sim' : 'Não'}`);
    
    if (pedidoExiste === 0) {
      console.log(`[GET /api/pedidos/${pedidoId}] Pedido #${pedidoId} não encontrado`);
      await browser.close();
      return res.status(404).json({ error: 'Pedido não encontrado' });
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
        return res.status(404).json({ error: 'Informações do pedido não encontradas' });
      }

      // Coleta os detalhes
      console.log(`[GET /api/pedidos/${pedidoId}] Coletando HTML dos detalhes do pedido #${pedidoId}...`);
      const detalhes = await page.$eval('.ta_visualizar_pedido', (div) => {
        return div.innerHTML.trim();
      });

      // Cria o objeto completo do pedido
      const pedidoCompleto = {
        ...infoPedido,
        detalhes: detalhes
      };

      console.log(`[GET /api/pedidos/${pedidoId}] Fechando navegador...`);
      await browser.close();
      
      console.log(`[GET /api/pedidos/${pedidoId}] Retornando detalhes do pedido #${pedidoId}`);
      return res.json(pedidoCompleto);
    } catch (error) {
      console.error(`[GET /api/pedidos/${pedidoId}] Erro ao coletar detalhes:`, error);
      await browser.close();
      return res.status(500).json({ error: 'Falha ao coletar detalhes do pedido', mensagem: error.message });
    }
  } catch (error) {
    console.error(`[GET /api/pedidos/${req.params.id}] Erro ao buscar o pedido:`, error);
    return res.status(500).json({ error: 'Falha ao buscar o pedido', mensagem: error.message });
  }
});

module.exports = router; 