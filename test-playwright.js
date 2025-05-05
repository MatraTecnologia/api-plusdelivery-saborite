const { chromium } = require('playwright');

const pedido = {'nome': 'Cliente Teste', 'telefone': '(27) 99999-9999', 'cep': '29100-291', 'bairro': 'Centro', 'endereco': 'Rua Teste', 'numero': '123', 'complemento': 'Apto 101', 'pagamento': 'Dinheiro', 'id_produto': '1'};

const testPlaywright = async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await context.clearCookies();
    console.log('Cookies limpos com sucesso!');
    
    await page.goto('https://demonstracao.saborite.com/adm/inicio/index/');
    await page.waitForLoadState('networkidle');
    
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('input[name="email"]');
    });

    if (!isLoggedIn) {
      await page.waitForLoadState('networkidle');
      console.log('Usuário não está logado. Iniciando fluxo de login...');
      await page.waitForTimeout(100);
      console.log('Preenchendo o email...');
      await page.click('input[name="email"]');
      await page.waitForTimeout(100);
      await page.keyboard.type('varela.suporte@gmail.com');
      await page.waitForTimeout(100);
      console.log('Preenchendo a senha...');
      await page.click('input[name="senha"]');
      await page.waitForTimeout(100);
      await page.keyboard.type('Varela123mafra');
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
    await page.goto('https://demonstracao.saborite.com/adm/pdv/index/');
    await page.waitForLoadState('networkidle');

    await page.click('a[href="javascript:addUsuario();"]');
    
    // Aguarda o modal do formulário aparecer
    await page.waitForSelector('#form-usuario');
    
    // Preenche o nome
    await page.fill('input[name="nome"]', cliente.nome);
    
    // Preenche o telefone
    await page.fill('input[name="tel"]', cliente.telefone);
    
    // Preenche o CEP
    await page.fill('input[name="cep"]', cliente.cep);
    
    // Seleciona o bairro
    await page.selectOption('select[name="bairro"]', cliente.bairro);
    
    // Preenche o endereço
    await page.fill('input[name="end"]', cliente.endereco);
    
    // Preenche o número
    await page.fill('input[name="nm"]', cliente.numero);
    
    // Preenche o complemento
    await page.fill('input[name="complemento"]', cliente.complemento);
    
    // Clica no botão salvar
    await page.click('button[class="btn btn-primary"]');
    
    // Aguarda o modal fechar
    await page.waitForTimeout(1000);

    //faz a busca do pedido
    await page.click('span[class="input-group-text"]');
    await page.waitForTimeout(1000);
    await page.click('input[class="swal2-input"]');
    await page.keyboard.type(pedido.id_produto);
    //clica no botao de enviar pedido
    await page.click('button[class="swal2-confirm swal2-styled swal2-default-outline"]');
    await page.waitForTimeout(1000);
    //clica no botao de enviar pedido
    await page.click('button[class="swal2-confirm swal2-styled swal2-default-outline"]');
    await page.waitForTimeout(1000);


    //pagamento

    await page.click('select[name="pagamento"]');
    await page.selectOption('select[name="pagamento"]', pedido.pagamento);
    //finalizar pedido
    await page.keyboard.press('Shift+F');
    await page.waitForTimeout(1000);
   
  
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (error) {
    console.error('Erro durante a execução:', error);
  } finally {
    await browser.close();
  }
};

testPlaywright(); 