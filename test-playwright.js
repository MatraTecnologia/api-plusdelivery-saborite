const { chromium } = require('playwright');

const testPlaywright = async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await context.clearCookies();
    console.log('Cookies limpos com sucesso!');
    
    await page.goto('https://minhaloja.plusdelivery.com.br/admin/login/');
    await page.waitForLoadState('networkidle');
    
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('input[name="login"]');
    });

    if (isLoggedIn) {
      await page.waitForLoadState('networkidle');
      console.log('Usuário não está logado. Iniciando fluxo de login...');
      await page.waitForTimeout(100);
      console.log('Preenchendo o email...');
      await page.click('input[name="login"]');
      await page.waitForTimeout(100);
      await page.keyboard.type('elzalanches2019@gmail.com');
      await page.waitForTimeout(100);
      console.log('Preenchendo a senha...');
      await page.click('input[name="senha"]');
      await page.waitForTimeout(100);
      await page.keyboard.type('Plus2910@vermelho');
      await page.waitForTimeout(100);
      console.log('Clicando no botão de login...');
      await page.click('input[type="submit"]');
      await page.waitForTimeout(1000);
    } else {
      console.log('Usuário já está logado. Prosseguindo com o fluxo...');
    }
    
    await page.waitForLoadState('networkidle');
    console.log('Página carregada com sucesso!');
    //navega ate a pagina de pedidos
    await page.waitForTimeout(10000);
    console.log('Navegando para a página de pedidos...');
    await page.click('a[href="javascript:void(0)"][id="cardapio_button"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('Aguardando carregamento da tabela de menus...');
    const frame = await page.waitForSelector('iframe[src*="webservice.plusdelivery.com.br"]');
    const frameContent = await frame.contentFrame();
    const menusContainer = await frameContent.waitForSelector('table#menus', { timeout: 10000 });
    console.log('Container de menus encontrado');
    await frameContent.waitForSelector('table#menus tr');
    console.log('Tabela de menus carregada com sucesso!');
    
    console.log('Obtendo linhas da tabela de menus...');
    const menuRows = await frameContent.$$('table#menus tr');
    console.log(`Total de ${menuRows.length} menus encontrados`);
    
    for (const row of menuRows) {
      console.log('Verificando disponibilidade do menu...');
      const isDisabled = await row.$('.indisponivel');
      
      if (!isDisabled) {
        console.log('Menu disponível, clicando para abrir...');
        await row.click();
        await frameContent.waitForTimeout(500);
        
        console.log('Aguardando carregamento do modal de produtos...');
        await frameContent.waitForSelector('.content', { timeout: 5000 }).catch(() => {
          console.log('Modal não encontrado para este menu');
        });
        
        console.log('Obtendo lista de produtos...');
        const produtos = await frameContent.$$('table#produtos tr');
        console.log(`Total de ${produtos.length} produtos encontrados`);
        
        const produtosData = [];

        for (const produto of produtos) {
          console.log('Extraindo dados do produto...');
          try {
            const id = await produto.$eval('.id', el => el.textContent.trim()).catch(() => 'ID não encontrado');
            const nome = await produto.$eval('.nome', el => el.textContent.trim()).catch(() => 'Nome não encontrado');
            
            // Verifica se o elemento existe antes de tentar extrair seu valor
            let valor = 'Valor não encontrado';
            if (await produto.$('.valor div')) {
              valor = await produto.$eval('.valor div', el => el.textContent.trim());
            }
            
            // Verifica se o elemento existe antes de tentar extrair o valor de promoção
            let promocao = 'Promoção não encontrada';
            if (await produto.$('.promocao div div')) {
              promocao = await produto.$eval('.promocao div div', el => el.textContent.trim());
            }
            
            // Verifica se o elemento existe antes de tentar extrair se está habilitado
            let habilitado = false;
            if (await produto.$('.habilitado input')) {
              habilitado = await produto.$eval('.habilitado input', el => el.checked);
            }

            produtosData.push({
              id,
              nome,
              valor,
              promocao,
              habilitado
            });
            console.log(`Produto ${id} - ${nome} processado`);
          } catch (err) {
            console.log(`Erro ao processar produto: ${err.message}`);
          }
        }

        console.log('Lista completa de produtos:', produtosData);
      } else {
        console.log('Menu indisponível, pulando...');
      }
    }
    
  
  
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (error) {
    console.error('Erro durante a execução:', error);
  } finally {
    await browser.close();
  }
};

testPlaywright(); 