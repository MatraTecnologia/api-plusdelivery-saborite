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
  const email = req.query.email || process.env.EMAIL_SABORITE || '';
  const senha = req.query.senha || process.env.SENHA_SABORITE || '';
  const contactIsexiste = req.body.contactIsexiste || false;
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
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();

      await page.goto('https://demonstracao.saborite.com/entrar/administracao/');
      await page.waitForLoadState('networkidle');

      const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('input[name="email"]');
      });

      if (!isLoggedIn) {
        await page.waitForLoadState('networkidle');
        console.log('Usuário não está logado. Iniciando fluxo de login...');
        await page.click('a[class="btn btn-primary my-3"]');
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
      if (!contactIsexiste) {
        await page.keyboard.press('Shift+A');
        await page.waitForTimeout(1000);

        await page.waitForSelector('#usuarioRapidoModal');

        await page.fill('input[name="nome"]', pedido.nome);
        await page.fill('input[name="tel"]', pedido.telefone);

        if (pedido.cep) await page.fill('input[name="cep"]', pedido.cep);
        if (pedido.bairro) await page.selectOption('select[name="bairro"]', pedido.bairro);
        if (pedido.endereco) await page.fill('input[name="end"]', pedido.endereco);
        if (pedido.numero) await page.fill('input[name="nm"]', pedido.numero);
        if (pedido.complemento) await page.fill('input[name="complemento"]', pedido.complemento);

        await page.click('button[class="btn btn-primary"]');
        await page.waitForTimeout(1000);
      } else {
        await page.fill('input[name="usuario"]', pedido.nome)
        await page.waitForTimeout(1000);

      }

      // Iterando sobre cada ID de produto
      let produtosNaoAdicionados = [];
      let produtosAdicionados = [];

      for (const idProduto of pedido.id_produtos) {
        console.log(`Tentando adicionar produto com ID: ${idProduto}`);
        try {
          // Abrir o modal para adicionar o produto
          await page.click('span[class="input-group-text"]');
          await page.waitForTimeout(1000);

          // Preencher o ID do produto
          await page.click('input[class="swal2-input"]');
          await page.keyboard.type(idProduto);

          // Confirmar a adição do produto
          await page.click('button[class="swal2-confirm swal2-styled swal2-default-outline"]');
          await page.waitForTimeout(2000);

          // Verificar se apareceu o modal de variações do produto
          try {
            const modalVariacoes = await page.waitForSelector('.modal-dialog', { state: 'visible', timeout: 5000 });
            if (modalVariacoes) {
              console.log(`Modal de variações apareceu para o produto ID ${idProduto}`);
              
              // Clicar no botão "Adicionar" do modal de variações
              const botaoAdicionar = await page.waitForSelector('button.addProd', { state: 'visible', timeout: 3000 });
              if (botaoAdicionar) {
                await page.click('button.addProd');
                console.log(`Clicou em "Adicionar" no modal de variações para o produto ID ${idProduto}`);
                await page.waitForTimeout(1000);
              }
            }
          } catch (error) {
            console.log(`Nenhum modal de variações apareceu para o produto ID ${idProduto} (isso é normal para produtos sem variações)`);
          }

          // Verificar se o produto foi adicionado à tabela
          const produtoAdicionado = await page.evaluate((id) => {
            const linhas = Array.from(document.querySelectorAll('#tabelaPdv tbody tr'));
            return linhas.some((linha) => linha.querySelector('td')?.textContent.trim() === id);
          }, idProduto);

          if (produtoAdicionado) {
            console.log(`Produto com ID ${idProduto} adicionado com sucesso.`);
            produtosAdicionados.push(idProduto);
          } else {
            console.warn(`Produto com ID ${idProduto} não foi adicionado.`);
            produtosNaoAdicionados.push(idProduto);
          }
        } catch (error) {
          console.error(`Erro ao tentar adicionar o produto com ID ${idProduto}:`, error);
          produtosNaoAdicionados.push(idProduto);
        }
      }

      // Tentar adicionar novamente os produtos que falharam
      if (produtosNaoAdicionados.length > 0) {
        console.log('Tentando adicionar novamente os produtos que falharam...');
        for (const idProduto of produtosNaoAdicionados) {
          try {
            console.log(`Tentando novamente adicionar produto com ID: ${idProduto}`);
            await page.click('span[class="input-group-text"]');
            await page.waitForTimeout(1000);

            await page.click('input[class="swal2-input"]');
            await page.keyboard.type(idProduto);

            await page.click('button[class="swal2-confirm swal2-styled swal2-default-outline"]');
            await page.waitForTimeout(2000);

            // Verificar se apareceu o modal de variações do produto (segunda tentativa)
            try {
              const modalVariacoes = await page.waitForSelector('.modal-dialog', { state: 'visible', timeout: 5000 });
              if (modalVariacoes) {
                console.log(`Modal de variações apareceu para o produto ID ${idProduto} (segunda tentativa)`);
                
                // Clicar no botão "Adicionar" do modal de variações
                const botaoAdicionar = await page.waitForSelector('button.addProd', { state: 'visible', timeout: 3000 });
                if (botaoAdicionar) {
                  await page.click('button.addProd');
                  console.log(`Clicou em "Adicionar" no modal de variações para o produto ID ${idProduto} (segunda tentativa)`);
                  await page.waitForTimeout(1000);
                }
              }
            } catch (error) {
              console.log(`Nenhum modal de variações apareceu para o produto ID ${idProduto} na segunda tentativa`);
            }

            const produtoAdicionado = await page.evaluate((id) => {
              const linhas = Array.from(document.querySelectorAll('#tabelaPdv tbody tr'));
              return linhas.some((linha) => linha.querySelector('td')?.textContent.trim() === id);
            }, idProduto);

            if (produtoAdicionado) {
              console.log(`Produto com ID ${idProduto} adicionado com sucesso na segunda tentativa.`);
              produtosAdicionados.push(idProduto);
              produtosNaoAdicionados = produtosNaoAdicionados.filter((id) => id !== idProduto);
            } else {
              console.warn(`Produto com ID ${idProduto} ainda não foi adicionado.`);
            }
          } catch (error) {
            console.error(`Erro ao tentar adicionar novamente o produto com ID ${idProduto}:`, error);
          }
        }
      }

      // Remover produtos que não correspondem
      console.log('Verificando e removendo produtos que não correspondem...');
      const produtosNaTabela = await page.evaluate(() => {
        const linhas = Array.from(document.querySelectorAll('#tabelaPdv tbody tr'));
        return linhas.map((linha) => linha.querySelector('td')?.textContent.trim());
      });

      for (const idProduto of produtosNaTabela) {
        if (!pedido.id_produtos.includes(idProduto)) {
          console.log(`Removendo produto não correspondente com ID: ${idProduto}`);
          await page.evaluate((id) => {
            const linha = Array.from(document.querySelectorAll('#tabelaPdv tbody tr')).find(
              (linha) => linha.querySelector('td')?.textContent.trim() === id
            );
            if (linha) {
              linha.querySelector('.fa-trash').click();
            }
          }, idProduto);
          await page.waitForTimeout(1000);
        }
      }



      await page.click('select[name="pagamento"]');
      await page.selectOption('select[name="pagamento"]', pedido.pagamento);

      // Clicar no botão "Finalizar" ao invés de usar tecla de atalho
      console.log('Finalizando pedido...');
      await page.click('button.btn.btn-primary.btn-block');
      await page.waitForTimeout(2000);

      await page.waitForTimeout(1000);
        

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Pedido enviado com sucesso',
        produtos_adicionados_qtd: produtosAdicionados.length,
        produtos_adicionados: produtosAdicionados,
        produtos_nao_adicionados: produtosNaoAdicionados
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