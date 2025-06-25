const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');
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

// Função para extrair as variações de um produto
const extrairVariacoesDoProduto = async (page) => {
  // Verifica se a tab de variações está visível, senão clica nela
  const tabVariacoes = await page.$('a[href="#variacoesTab"]');
  if (tabVariacoes) {
    const isActive = await tabVariacoes.evaluate(el => el.classList.contains('active'));
    if (!isActive) {
      await tabVariacoes.click();
      await page.waitForTimeout(300);
    }
  }

  // Extrai as variações do produto
  const variacoes = await page.evaluate(() => {
    const result = [];

    // Loop para cada possível variação (até 5)
    for (let i = 1; i <= 5; i++) {
      const sufixo = i === 1 ? '' : i;

      // Pega os elementos de cada campo
      const descricaoEl = document.querySelector(`input[name="tamanho${sufixo}"]`);
      const qtdAtacadoEl = document.querySelector(`input[name="qtd_atacado${sufixo}"]`);
      const precoAtacadoEl = document.querySelector(`input[name="preco_atacado${sufixo}"]`);
      const precoCustoEl = document.querySelector(`input[name="preco_custo${sufixo}"]`);
      const precoEl = document.querySelector(`input[name="preco${sufixo}"]`);

      // Extrai valores, verificando se os elementos existem
      const descricao = descricaoEl ? descricaoEl.value : '';

      // Se não tem descrição e é a primeira variação, usa um valor padrão
      if (i === 1 && (!descricao || descricao.trim() === '')) {
        const precoValue = precoEl ? precoEl.value : '';

        // Só adiciona se tiver preço
        if (precoValue && precoValue.trim() !== '') {
          result.push({
            descricao: 'Padrão',
            qtd_atacado: qtdAtacadoEl ? qtdAtacadoEl.value : '',
            preco_atacado: precoAtacadoEl ? precoAtacadoEl.value : '',
            preco_custo: precoCustoEl ? precoCustoEl.value : '',
            preco: precoValue
          });
        }
      }
      // Para variações subsequentes, só adiciona se tiver descrição
      else if (descricao && descricao.trim() !== '') {
        result.push({
          descricao,
          qtd_atacado: qtdAtacadoEl ? qtdAtacadoEl.value : '',
          preco_atacado: precoAtacadoEl ? precoAtacadoEl.value : '',
          preco_custo: precoCustoEl ? precoCustoEl.value : '',
          preco: precoEl ? precoEl.value : ''
        });
      }
    }

    return result;
  });

  return variacoes;
};

// Função para extrair os opcionais de um produto
const extrairOpcionaisDoProduto = async (page) => {
  // Verifica se a tab de opcionais está visível, senão clica nela
  const tabOpcionais = await page.$('a[href="#opcionaisTab"]');
  if (tabOpcionais) {
    const isActive = await tabOpcionais.evaluate(el => el.classList.contains('active'));
    if (!isActive) {
      await tabOpcionais.click();
      await page.waitForTimeout(300);
    }
  }

  // Extrai os grupos de opcionais selecionados
  const opcionais = await page.evaluate(() => {
    const result = [];

    // Encontra todos os checkboxes marcados
    const checkboxes = document.querySelectorAll('input[name="adicionais[]"]:checked');

    checkboxes.forEach(checkbox => {
      const id = checkbox.value;
      const label = document.querySelector(`label[for="adc${id}"]`);

      if (label) {
        // Pega apenas o texto principal, não inclui o texto dos filhos
        let nome = '';
        for (const node of label.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            nome += node.textContent.trim();
          }
        }

        // Verifica se é obrigatório
        const obrigatorio = !!label.querySelector('.badge-primary');

        // Pega a descrição (texto pequeno)
        const descricaoEl = label.querySelector('p.small.text-muted');
        const descricao = descricaoEl ? descricaoEl.textContent.trim() : '';

        result.push({
          id,
          nome: nome.trim(),
          obrigatorio,
          descricao
        });
      }
    });

    return result;
  });

  return opcionais;
};

// Função para extrair produtos de uma página
const extrairProdutosDaPagina = async (page) => {
  const produtos = await page.evaluate(() => {
    const result = [];
    let currentCategory = null;

    // Seleciona todas as linhas da tabela
    const rows = document.querySelectorAll('#DataTables_Table_0 tbody tr');

    rows.forEach(row => {
      // Verifica se é uma linha de categoria
      if (row.classList.contains('dtrg-start')) {
        currentCategory = row.querySelector('th').textContent.trim();
        return;
      }

      // Se não for linha de categoria, extrai dados do produto
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) return;

      const id = cells[0].textContent.trim();

      // Extrai nome e descrição
      const nomeElement = cells[1].querySelector('.col');
      if (!nomeElement) return; // Pula se não encontrar o elemento do nome

      const nome = nomeElement.childNodes[0].textContent.trim();

      // Verifica se há descrição (p.small)
      const descricaoElement = nomeElement.querySelector('p.small');
      const descricao = descricaoElement ? descricaoElement.textContent.trim() : '';

      // Extrai preço
      const precoElement = cells[2].querySelector('.hide');
      const preco = precoElement ? precoElement.textContent.trim() : '';

      // Verifica status
      const statusElement = cells[3].querySelector('input[type="checkbox"]');
      const ativo = statusElement ? statusElement.checked : false;

      // Extrai URL da imagem
      const imgElement = cells[1].querySelector('img');
      const imagem = imgElement ? imgElement.getAttribute('src') : '';

      // Verifica se tem código de barras (alguns produtos têm)
      const barcodeButton = cells[4].querySelector('button[onclick*="getCodigoBarras"]');
      let codigoBarras = null;

      if (barcodeButton) {
        const onclickAttr = barcodeButton.getAttribute('onclick');
        const matches = onclickAttr.match(/'([^']+)'/);
        if (matches && matches.length > 1) {
          codigoBarras = matches[1];
        }
      }

      // Adiciona produto ao resultado
      result.push({
        id,
        categoria: currentCategory,
        nome,
        descricao,
        preco,
        ativo,
        codigoBarras,
        imagem: imagem ? 'https://demonstracao.saborite.com' + imagem : '',
        variacoes: [], // Será preenchido posteriormente
        opcionais: []  // Será preenchido posteriormente
      });
    });

    return result;
  });

  return produtos;
};

// Função para extrair detalhes dos produtos
const extrairDetalhesDosProdutos = async (page, produtos) => {
  // Para cada produto, extrai as variações e opcionais
  for (let i = 0; i < produtos.length; i++) {
    const produto = produtos[i];

    try {
      // Abre o modal de edição do produto
      await page.evaluate((produtoId) => {
        const editButton = document.querySelector(`button[onclick*="setProduto({id: ${produtoId}});"]`);
        if (editButton) {
          editButton.click();
        }
      }, produto.id);

      // Aguarda o modal abrir
      await page.waitForSelector('.modal-content', { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(500); // Dá um tempo para carregar os dados

      // Extrai as variações
      const variacoes = await extrairVariacoesDoProduto(page);
      produto.variacoes = variacoes;

      // Extrai os grupos de opcionais
      const opcionais = await extrairOpcionaisDoProduto(page);
      produto.opcionais = opcionais;

      // Fecha o modal
      await page.click('button.btn-secondary[onclick="cancelar()"]');
      await page.waitForSelector('.modal-content', { state: 'hidden', timeout: 5000 });
      await page.waitForTimeout(300);

    } catch (error) {
      console.error(`[GET /api/cardapio-sab] Erro ao extrair detalhes do produto ${produto.nome} (ID: ${produto.id}):`, error);
    }
  }
};

// Função para contar o total de páginas
const contarTotalDePaginas = async (page) => {
  return await page.evaluate(() => {
    // Encontra todos os links de paginação exceto "Próxima", "Anterior" e "..."
    const pageLinks = Array.from(document.querySelectorAll('.paginate_button.page-item:not(.previous):not(.next):not(.disabled)'));
    if (pageLinks.length === 0) return 1;

    // Encontra o número da última página 
    const pageNumbers = pageLinks.map(link => {
      const pageNum = parseInt(link.textContent.trim());
      return isNaN(pageNum) ? 0 : pageNum;
    });

    return Math.max(...pageNumbers);
  });
};

// Função para navegar para uma página específica
const irParaPagina = async (page, numeroPagina) => {
  const navegouComSucesso = await page.evaluate((pagina) => {
    // Encontra o link da página desejada
    const pageLink = document.querySelector(`.paginate_button.page-item a[data-dt-idx="${pagina}"]`);
    if (pageLink) {
      pageLink.click();
      return true;
    }
    return false;
  }, numeroPagina);

  if (navegouComSucesso) {
    // Aguarda o carregamento dos dados da nova página
    await page.waitForSelector('#DataTables_Table_0 tbody tr', { state: 'attached' });
    await page.waitForTimeout(500); // Tempo extra para garantir que a tabela atualizou
  } else {
    // Se não conseguir ir direto para a página, tenta usar o botão "Próxima"
    const clicouProxima = await page.evaluate(() => {
      const nextButton = document.querySelector('#DataTables_Table_0_next');
      if (nextButton && !nextButton.classList.contains('disabled')) {
        nextButton.querySelector('a').click();
        return true;
      }
      return false;
    });

    if (clicouProxima) {
      await page.waitForSelector('#DataTables_Table_0 tbody tr', { state: 'attached' });
      await page.waitForTimeout(500);
    } else {
      return false;
    }
  }

  return true;
};

// Endpoint principal para buscar o cardápio do Saborite
router.get('/', async (req, res) => {
  // Obter credenciais da requisição ou usar valores do .env como fallback
  const email = req.query.email || process.env.EMAIL_SABORITE || '';
  const senha = req.query.senha || process.env.SENHA_SABORITE || '';
  const formatoSimples = req.query.formato_simples === 'true'; // Parâmetro para retornar formato simplificado
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`[GET /api/cardapio-sab] Iniciando com email: ${email}`);

  try {
    if (!email || !senha) {
      console.log('[GET /api/cardapio-sab] Erro: Email ou senha não fornecidos');
      return res.status(400).json({
        error: 'Credenciais ausentes',
        tipo: TIPOS_ERRO.CREDENCIAIS_AUSENTES,
        detalhes: 'Email e senha são obrigatórios para acessar esta rota',
        codigo: 400
      });
    }

    console.log('[GET /api/cardapio-sab] Limpando cookies...');
    await context.clearCookies();

    console.log('[GET /api/cardapio-sab] Navegando para página de login...');
    await page.goto('https://demonstracao.saborite.com/entrar/administracao/');
    await page.waitForLoadState('networkidle');

    // Verifica se já está na página de login
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('input[name="email"]');
    });

    if (!isLoggedIn) {
      console.log('[GET /api/cardapio-sab] Iniciando fluxo de login...');
      await page.click('a[class="btn btn-primary my-3"]');
      await page.waitForTimeout(100);
      await page.click('input[name="email"]');
      await page.waitForTimeout(100);
      await page.keyboard.type(email);
      await page.waitForTimeout(100);
      await page.click('input[name="senha"]');
      await page.waitForTimeout(100);
      await page.keyboard.type(senha);
      await page.waitForTimeout(100);
      console.log('[GET /api/cardapio-sab] Enviando formulário de login...');
      await page.click('input[type="submit"]');
      await page.waitForTimeout(1000);
    } else {
      console.log('[GET /api/cardapio-sab] Usuário já está logado');
    }

    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(5000);

    // Navegar até a página de produtos
    console.log('[GET /api/cardapio-sab] Navegando para a página de produtos...');
    await page.goto('https://demonstracao.saborite.com/adm/produtos/lista/');
    await page.waitForLoadState('networkidle');

    // Obtém o número total de páginas
    const totalPaginas = await contarTotalDePaginas(page);
    console.log(`[GET /api/cardapio-sab] Total de páginas encontradas: ${totalPaginas}`);

    let todosProdutos = [];

    // Itera por todas as páginas
    for (let paginaAtual = 1; paginaAtual <= totalPaginas; paginaAtual++) {
      console.log(`[GET /api/cardapio-sab] Processando página ${paginaAtual} de ${totalPaginas}...`);

      // Se não for a primeira página, navega para ela
      if (paginaAtual > 1) {
        const paginaAlcancada = await irParaPagina(page, paginaAtual);
        if (!paginaAlcancada) break; // Se não conseguir navegar, para o loop
      }

      // Extrai os produtos da página atual
      const produtosDaPagina = await extrairProdutosDaPagina(page);
      console.log(`[GET /api/cardapio-sab] Encontrados ${produtosDaPagina.length} produtos na página ${paginaAtual}.`);

      // Extrai os detalhes de cada produto
      await extrairDetalhesDosProdutos(page, produtosDaPagina);

      // Adiciona aos produtos totais
      todosProdutos = [...todosProdutos, ...produtosDaPagina];
    }

    console.log(`[GET /api/cardapio-sab] Finalizada extração de ${todosProdutos.length} produtos no total.`);
    await browser.close();

    // Opção 1: Retorno no formato simples (apenas a lista de produtos)
    if (formatoSimples) {
      return res.status(200).json({
        sucesso: true,
        produtos: todosProdutos,
        total_produtos: todosProdutos.length
      });
    }

    // Opção 2: Retorno estruturado por categorias (formato padrão)
    const categorias = {};

    todosProdutos.forEach(produto => {
      if (!categorias[produto.categoria]) {
        categorias[produto.categoria] = [];
      }
      categorias[produto.categoria].push(produto);
    });

    return res.status(200).json({
      sucesso: true,
      categorias,
      total_categorias: Object.keys(categorias).length,
      total_produtos: todosProdutos.length
    });

  } catch (error) {
    console.error(`[GET /api/cardapio-sab] Erro durante a execução: ${error.message}`);

    try {
      await browser.close();
    } catch (e) {
      console.error(`[GET /api/cardapio-sab] Erro ao fechar o navegador: ${e.message}`);
    }

    return res.status(500).json({
      error: 'Erro interno do servidor',
      tipo: TIPOS_ERRO.ERRO_INTERNO,
      detalhes: error.message,
      codigo: 500
    });
  }
});

// Endpoint para retornar apenas os produtos, sem categorização
router.get('/produtos', async (req, res) => {
  // Obter credenciais da requisição ou usar valores do .env como fallback
  const email = req.query.email || process.env.EMAIL_SABORITE || '';
  const senha = req.query.senha || process.env.SENHA_SABORITE || '';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`[GET /api/cardapio-sab/produtos] Iniciando com email: ${email}`);

  try {
    if (!email || !senha) {
      console.log('[GET /api/cardapio-sab/produtos] Erro: Email ou senha não fornecidos');
      return res.status(400).json({
        error: 'Credenciais ausentes',
        tipo: TIPOS_ERRO.CREDENCIAIS_AUSENTES,
        detalhes: 'Email e senha são obrigatórios para acessar esta rota',
        codigo: 400
      });
    }

    console.log('[GET /api/cardapio-sab/produtos] Limpando cookies...');
    await context.clearCookies();

    console.log('[GET /api/cardapio-sab/produtos] Navegando para página de login...');
    await page.goto('https://demonstracao.saborite.com/entrar/administracao/');
    await page.waitForLoadState('networkidle');

    // Verifica se já está na página de login
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('input[name="email"]');
    });

    if (isLoggedIn) {
      console.log('[GET /api/cardapio-sab/produtos] Iniciando fluxo de login...');
      await page.click('a[class="btn btn-primary my-3"]');
      await page.waitForTimeout(100);
      await page.click('input[name="email"]');
      await page.waitForTimeout(100);
      await page.keyboard.type(email);
      await page.waitForTimeout(100);
      await page.click('input[name="senha"]');
      await page.waitForTimeout(100);
      await page.keyboard.type(senha);
      await page.waitForTimeout(100);
      console.log('[GET /api/cardapio-sab/produtos] Enviando formulário de login...');
      await page.click('input[type="submit"]');
      await page.waitForTimeout(1000);
    } else {
      console.log('[GET /api/cardapio-sab/produtos] Usuário já está logado');
    }

    await page.waitForLoadState('networkidle');

    // Verificar se o login foi bem-sucedido
    try {
      await page.waitForSelector('.logo', { timeout: 5000 });
    } catch (error) {
      console.error('[GET /api/cardapio-sab/produtos] Falha no login:', error);
      await browser.close();
      return res.status(401).json({
        error: 'Falha no login',
        tipo: TIPOS_ERRO.FALHA_LOGIN,
        detalhes: 'Credenciais inválidas ou site indisponível',
        codigo: 401
      });
    }

    // Navegar até a página de produtos
    console.log('[GET /api/cardapio-sab/produtos] Navegando para a página de produtos...');
    await page.goto('https://demonstracao.saborite.com/adm/produtos/lista/');
    await page.waitForLoadState('networkidle');

    // Obtém o número total de páginas
    const totalPaginas = await contarTotalDePaginas(page);
    console.log(`[GET /api/cardapio-sab/produtos] Total de páginas encontradas: ${totalPaginas}`);

    let todosProdutos = [];

    // Itera por todas as páginas
    for (let paginaAtual = 1; paginaAtual <= totalPaginas; paginaAtual++) {
      console.log(`[GET /api/cardapio-sab/produtos] Processando página ${paginaAtual} de ${totalPaginas}...`);

      // Se não for a primeira página, navega para ela
      if (paginaAtual > 1) {
        const paginaAlcancada = await irParaPagina(page, paginaAtual);
        if (!paginaAlcancada) break; // Se não conseguir navegar, para o loop
      }

      // Extrai os produtos da página atual
      const produtosDaPagina = await extrairProdutosDaPagina(page);
      console.log(`[GET /api/cardapio-sab/produtos] Encontrados ${produtosDaPagina.length} produtos na página ${paginaAtual}.`);

      // Extrai os detalhes de cada produto
      await extrairDetalhesDosProdutos(page, produtosDaPagina);

      // Adiciona aos produtos totais
      todosProdutos = [...todosProdutos, ...produtosDaPagina];
    }

    console.log(`[GET /api/cardapio-sab/produtos] Finalizada extração de ${todosProdutos.length} produtos no total.`);
    await browser.close();

    // Retorna diretamente a lista de produtos
    return res.status(200).json({
      sucesso: true,
      produtos: todosProdutos,
      total_produtos: todosProdutos.length
    });

  } catch (error) {
    console.error(`[GET /api/cardapio-sab/produtos] Erro durante a execução: ${error.message}`);

    try {
      await browser.close();
    } catch (e) {
      console.error(`[GET /api/cardapio-sab/produtos] Erro ao fechar o navegador: ${e.message}`);
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