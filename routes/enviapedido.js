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

// Rota para enviar pedido
router.post('/', async (req, res) => {
  const pedido = req.body;
  const email = pedido.email;
  const senha = pedido.senha;
  let browser;
  let page;

  console.log(pedido);
  try {
    if (!pedido) {
      return res.status(400).json({
        error: 'Dados do pedido ausentes',
        tipo: TIPOS_ERRO.CREDENCIAIS_AUSENTES,
        detalhes: 'Os dados do pedido são obrigatórios',
        codigo: 400
      });
    }

    if (!Array.isArray(pedido.id_produtos)) {
      return res.status(400).json({
        error: 'Formato inválido',
        tipo: TIPOS_ERRO.CREDENCIAIS_AUSENTES,
        detalhes: 'O campo id_produtos deve ser um array',
        codigo: 400
      });
    }

    try {
      browser = await chromium.launch({ headless: false });
      page = await browser.newPage();
      
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
        await page.keyboard.type(email);
        await page.waitForTimeout(100);
        console.log('Preenchendo a senha...');
        await page.click('input[name="senha"]');
        await page.waitForTimeout(100);
        await page.keyboard.type(senha);
        await page.waitForTimeout(100);
        console.log('Clicando no botão de login...');
        await page.click('input[type="submit"]');
        await page.waitForTimeout(1000);
      } else {
        console.log('Usuário já está logado. Prosseguindo com o fluxo...');
      }
      
      await page.waitForLoadState('networkidle');
      console.log('Página carregada com sucesso!');
      
      await page.goto('https://demonstracao.saborite.com/adm/pdv/index/');
      await page.waitForLoadState('networkidle');

      await page.click('a[href="javascript:addUsuario();"]');
      
      await page.waitForSelector('#form-usuario');
      
      await page.fill('input[name="nome"]', pedido.nome);
      await page.fill('input[name="tel"]', pedido.telefone);
      await page.fill('input[name="cep"]', pedido.cep);
      await page.selectOption('select[name="bairro"]', pedido.bairro);
      await page.fill('input[name="end"]', pedido.endereco);
      await page.fill('input[name="nm"]', pedido.numero);
      await page.fill('input[name="complemento"]', pedido.complemento);
      
      await page.click('button[class="btn btn-primary"]');
      await page.waitForTimeout(1000);

      // Iterando sobre cada ID de produto
      for (const idProduto of pedido.id_produtos) {
        console.log(`Adicionando produto com ID: ${idProduto}`);
        await page.click('span[class="input-group-text"]');
        await page.waitForTimeout(1000);
        await page.click('input[class="swal2-input"]');
        await page.keyboard.type(idProduto);
        
        await page.click('button[class="swal2-confirm swal2-styled swal2-default-outline"]');
        await page.waitForTimeout(1000);
        await page.click('button[class="swal2-confirm swal2-styled swal2-default-outline"]');
        await page.waitForTimeout(1000);
      }

      await page.click('select[name="pagamento"]');
      await page.selectOption('select[name="pagamento"]', pedido.pagamento);
      
      await page.keyboard.press('Shift+F');
      await page.waitForTimeout(1000);

      await new Promise(resolve => setTimeout(resolve, 3000));

      return res.json({
        sucesso: true,
        mensagem: 'Pedido enviado com sucesso',
        produtos_adicionados: pedido.id_produtos.length
      });

    } catch (error) {
      console.error('Erro durante a execução:', error);
      return res.status(500).json({
        error: 'Erro durante a execução',
        tipo: TIPOS_ERRO.ERRO_INTERNO,
        detalhes: error.message,
        codigo: 500
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error('Erro ao iniciar o navegador:', error);
    return res.status(500).json({
      error: 'Erro ao iniciar o navegador',
      tipo: TIPOS_ERRO.FALHA_CONEXAO,
      detalhes: error.message,
      codigo: 500
    });
  }
});

module.exports = router; 