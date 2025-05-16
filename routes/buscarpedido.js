const express = require('express');
const { chromium } = require('playwright');
const router = express.Router();

// Tipos de erro para facilitar a identificação de problemas
const TIPOS_ERRO = {
  CREDENCIAIS_INVALIDAS: 'ERR_CREDENCIAIS_INVALIDAS',
  CREDENCIAIS_AUSENTES: 'ERR_CREDENCIAIS_AUSENTES',
  FALHA_LOGIN: 'ERR_FALHA_LOGIN',
  FALHA_CONEXAO: 'ERR_FALHA_CONEXAO',
  MENU_NAO_ENCONTRADO: 'ERR_MENU_NAO_ENCONTRADO',
  TIMEOUT: 'ERR_TIMEOUT',
  ERRO_INTERNO: 'ERR_INTERNO'
};

// Endpoint para buscar produtos do cardápio
router.get('/', async (req, res) => {
  // Obter credenciais da requisição ou usar valores do .env como fallback
// Como deveria ser:
const email = req.query.email || req.body.email || process.env.EMAIL || '';
const senha = req.query.senha || req.body.senha || process.env.SENHA || '';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log(`[GET /api/cardapio] Iniciando com email: ${email}`);

  try {
    if (!email || !senha) {
      console.log('[GET /api/cardapio] Erro: Email ou senha não fornecidos');
      return res.status(400).json({ 
        error: 'Credenciais ausentes',
        tipo: TIPOS_ERRO.CREDENCIAIS_AUSENTES,
        detalhes: 'Email e senha são obrigatórios para acessar esta rota',
        codigo: 400
      });
    }
    
    console.log('[GET /api/cardapio] Limpando cookies...');
    await context.clearCookies();
    
    console.log('[GET /api/cardapio] Navegando para página de login...');
    await page.goto('https://minhaloja.plusdelivery.com.br/admin/login/');
    await page.waitForLoadState('networkidle');
    
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('input[name="login"]');
    });

    if (isLoggedIn) {
      console.log('[GET /api/cardapio] Iniciando fluxo de login...');
      await page.waitForTimeout(100);
      await page.click('input[name="login"]');
      await page.waitForTimeout(100);
      await page.keyboard.type(email);
      await page.waitForTimeout(100);
      await page.click('input[name="senha"]');
      await page.waitForTimeout(100);
      await page.keyboard.type(senha);
      await page.waitForTimeout(100);
      console.log('[GET /api/cardapio] Enviando formulário de login...');
      await page.click('input[type="submit"]');
      await page.waitForTimeout(1000);
    } else {
      console.log('[GET /api/cardapio] Usuário já está logado');
    }
    
    await page.waitForLoadState('networkidle');
    console.log('[GET /api/cardapio] Verificando login bem-sucedido...');
    
    // Verificar se login foi bem-sucedido
    try {
      await page.waitForSelector('a[id="cardapio_button"]', { timeout: 5000 });
    } catch (error) {
      console.error('[GET /api/cardapio] Falha no login:', error);
      await browser.close();
      return res.status(401).json({ 
        error: 'Falha no login',
        tipo: TIPOS_ERRO.FALHA_LOGIN,
        detalhes: 'Credenciais inválidas ou site indisponível',
        codigo: 401
      });
    }
    
    // Navegar até a página de cardápio
    console.log('[GET /api/cardapio] Navegando para a página de cardápio...');
    await page.click('a[href="javascript:void(0)"][id="cardapio_button"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Verificar se estamos na página correta
    const currentUrl = page.url();
    console.log(`[GET /api/cardapio] URL atual: ${currentUrl}`);
    
    // Aguardar mais tempo para garantir que a página carregou completamente
    await page.waitForTimeout(2000);
    
    console.log('[GET /api/cardapio] Procurando iframe do cardápio...');
    
    // Aguardar mais tempo pelo carregamento da página
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Verificar se existem iframes na página
    const iframeCount = await page.$$eval('iframe[src*="webservice.plusdelivery.com.br"]', iframes => iframes.length);
    console.log(`[GET /api/cardapio] Encontrados ${iframeCount} iframes na página`);
    
    // Se não encontrou nenhum iframe, tenta recarregar a página
    if (iframeCount === 0) {
      console.log('[GET /api/cardapio] Nenhum iframe encontrado. Tentando recarregar a página...');
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('[GET /api/cardapio] Página recarregada, verificando iframes novamente...');
    }
    
    // Implementar retentativas para encontrar o iframe
    let frame = null;
    let frameContent = null;
    let tentativas = 0;
    const maxTentativas = 3;
    
    while (tentativas < maxTentativas) {
      try {
        console.log(`[GET /api/cardapio] Tentativa ${tentativas + 1} de ${maxTentativas} para encontrar o iframe...`);
        frame = await page.waitForSelector('iframe[src*="webservice.plusdelivery.com.br"]', { timeout: 30000 });
        frameContent = await frame.contentFrame();
        console.log('[GET /api/cardapio] Iframe encontrado com sucesso!');
        break;
      } catch (iframeError) {
        tentativas++;
        console.error(`[GET /api/cardapio] Erro ao encontrar iframe (tentativa ${tentativas}): ${iframeError.message}`);
        
        if (tentativas >= maxTentativas) {
          console.error('[GET /api/cardapio] Número máximo de tentativas excedido.');
          await browser.close();
          return res.status(500).json({
            error: 'Erro ao carregar iframe',
            tipo: TIPOS_ERRO.TIMEOUT,
            detalhes: 'Não foi possível carregar o iframe após várias tentativas',
            codigo: 500
          });
        }
        
        // Esperar e tentar novamente
        console.log('[GET /api/cardapio] Aguardando 2 segundos antes de tentar novamente...');
        await page.waitForTimeout(2000);
        await page.reload();
        await page.waitForLoadState('networkidle', { timeout: 15000 });
      }
    }
    
    console.log('[GET /api/cardapio] Aguardando tabela de menus...');
    try {
      const menusContainer = await frameContent.waitForSelector('table#menus', { timeout: 15000 });
      await frameContent.waitForSelector('table#menus tr', { timeout: 15000 });
      
      console.log('[GET /api/cardapio] Obtendo linhas da tabela de menus...');
      const menuRows = await frameContent.$$('table#menus tr');
      console.log(`[GET /api/cardapio] Total de ${menuRows.length} menus encontrados`);
      
      if (menuRows.length === 0) {
        console.log('[GET /api/cardapio] Nenhum menu encontrado');
        await browser.close();
        return res.status(404).json({
          error: 'Menus não encontrados',
          tipo: TIPOS_ERRO.MENU_NAO_ENCONTRADO,
          detalhes: 'Não foi possível encontrar menus disponíveis',
          codigo: 404
        });
      }
    } catch (menuError) {
      console.error(`[GET /api/cardapio] Erro ao carregar menus: ${menuError.message}`);
      await browser.close();
      return res.status(500).json({
        error: 'Erro ao carregar menus',
        tipo: TIPOS_ERRO.TIMEOUT,
        detalhes: menuError.message,
        codigo: 500
      });
    }
    
    // Armazenar todos os produtos de todos os menus
    const todosMenus = [];
    
    for (const row of menuRows) {
      const isDisabled = await row.$('.indisponivel');
      
      // Extrair nome do menu
      let nomeMenu = 'Menu Sem Nome';
      try {
        const nomeElement = await row.$('td.nome');
        if (nomeElement) {
          nomeMenu = await nomeElement.textContent();
        }
      } catch (err) {
        console.log(`[GET /api/cardapio] Erro ao extrair nome do menu: ${err.message}`);
      }
      
      const menu = {
        nome: nomeMenu,
        disponivel: !isDisabled,
        produtos: []
      };
      
      if (!isDisabled) {
        console.log(`[GET /api/cardapio] Processando menu '${nomeMenu}'...`);
        await row.click();
        await frameContent.waitForTimeout(500);
        
        try {
          await frameContent.waitForSelector('.content', { timeout: 5000 });
          const produtos = await frameContent.$$('table#produtos tr');
          console.log(`[GET /api/cardapio] Total de ${produtos.length} produtos encontrados no menu '${nomeMenu}'`);
          
          for (const produto of produtos) {
            try {
              let id = 'ID não encontrado';
              if (await produto.$('.id')) {
                id = await produto.$eval('.id', el => el.textContent.trim());
              }
              
              let nome = 'Nome não encontrado';
              if (await produto.$('.nome')) {
                nome = await produto.$eval('.nome', el => el.textContent.trim());
              }
              
              let valor = 'Valor não encontrado';
              if (await produto.$('.valor div')) {
                valor = await produto.$eval('.valor div', el => el.textContent.trim());
              }
              
              let promocao = 'Promoção não encontrada';
              if (await produto.$('.promocao div div')) {
                promocao = await produto.$eval('.promocao div div', el => el.textContent.trim());
              }
              
              let habilitado = false;
              if (await produto.$('.habilitado input')) {
                habilitado = await produto.$eval('.habilitado input', el => el.checked);
              }
              
              menu.produtos.push({
                id,
                nome,
                valor,
                promocao,
                habilitado
              });
              
              console.log(`[GET /api/cardapio] Produto '${nome}' processado`);
            } catch (err) {
              console.log(`[GET /api/cardapio] Erro ao processar produto: ${err.message}`);
            }
          }
        } catch (err) {
          console.log(`[GET /api/cardapio] Erro ao abrir modal de produtos: ${err.message}`);
        }
      }
      
      todosMenus.push(menu);
    }
    
    console.log(`[GET /api/cardapio] Finalizado processamento de ${todosMenus.length} menus`);
    await browser.close();
    
    return res.status(200).json({
      sucesso: true,
      menus: todosMenus,
      total_menus: todosMenus.length,
      total_produtos: todosMenus.reduce((sum, menu) => sum + menu.produtos.length, 0)
    });
    
  } catch (error) {
    console.error(`[GET /api/cardapio] Erro durante a execução: ${error.message}`);
    
    try {
      await browser.close();
    } catch (e) {
      console.error(`[GET /api/cardapio] Erro ao fechar o navegador: ${e.message}`);
    }
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      tipo: TIPOS_ERRO.ERRO_INTERNO,
      detalhes: error.message,
      codigo: 500
    });
  }
});

module.exports = router; 