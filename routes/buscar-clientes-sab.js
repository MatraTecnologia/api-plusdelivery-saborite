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

// Função para extrair clientes de uma página
const extrairClientesDaPagina = async (page) => {
  console.log('[extrairClientesDaPagina] Extraindo clientes da página...');
  const clientes = await page.evaluate(() => {
    const result = [];
    const rows = document.querySelectorAll('#DataTables_Table_0 tbody tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) return;

      const id = cells[0].textContent.trim();
      const nome = cells[1].textContent.trim();
      const telefone = cells[2].textContent.trim();

      const bloqueadoInput = cells[4].querySelector('input[type="checkbox"]');
      const permitirRoboInput = cells[5].querySelector('input[type="checkbox"]');
      const permitirCampanhasInput = cells[6].querySelector('input[type="checkbox"]');

      const bloqueado = bloqueadoInput ? bloqueadoInput.checked : false;
      const permitirRobo = permitirRoboInput ? permitirRoboInput.checked : false;
      const permitirCampanhas = permitirCampanhasInput ? permitirCampanhasInput.checked : false;

      result.push({
        id,
        nome,
        telefone,
        bloqueado,
        permitirRobo,
        permitirCampanhas,
      });
    });

    return result;
  });

  console.log(`[extrairClientesDaPagina] Total de clientes extraídos: ${clientes.length}`);
  return clientes;
};

// Função para contar o total de páginas
const contarTotalDePaginas = async (page) => {
  console.log('[contarTotalDePaginas] Contando o total de páginas...');

  page.waitForTimeout(10000); // Aguarda 10 segundos para garantir que a página esteja totalmente carregada
  const tabela = await page.$('#DataTables_Table_0');
  const totalPaginas = await page.evaluate(() => {
    const pageLinks = Array.from(document.querySelectorAll('.paginate_button.page-item:not(.previous):not(.next):not(.disabled)'));
    if (pageLinks.length === 0) return 1;

    const pageNumbers = pageLinks.map(link => {
      const pageNum = parseInt(link.textContent.trim());
      return isNaN(pageNum) ? 0 : pageNum;
    });

    return Math.max(...pageNumbers);
  });

  console.log(`[contarTotalDePaginas] Total de páginas: ${totalPaginas}`);
  return totalPaginas;
};

// Função para navegar para a página 1 (inicial)
const irParaPrimeíraPagina = async (page) => {
  console.log('[irParaPrimeíraPagina] Navegando para a primeira página...');

  const navegouComSucesso = await page.evaluate(() => {
    // Procura pelo link da página 1
    const pageLink = document.querySelector('.paginate_button.page-item a[data-dt-idx="1"]');
    if (pageLink && !pageLink.closest('.page-item').classList.contains('active')) {
      pageLink.click();
      return true;
    }
    return false; // Já está na página 1 ou não encontrou o link
  });

  if (navegouComSucesso) {
    await page.waitForSelector('#DataTables_Table_0 tbody tr', { state: 'attached' });
    await page.waitForTimeout(2000);
    console.log('[irParaPrimeíraPagina] Primeira página carregada com sucesso.');
  } else {
    console.log('[irParaPrimeíraPagina] Já está na primeira página ou não foi necessário navegar.');
  }

  return true;
};

// Função para navegar para a próxima página usando o botão "Próxima"
const irParaProximaPagina = async (page) => {
  console.log('[irParaProximaPagina] Clicando no botão "Próxima"...');

  const temProximaPagina = await page.evaluate(() => {
    const nextButton = document.querySelector('#DataTables_Table_0_next');
    if (nextButton && !nextButton.classList.contains('disabled')) {
      const nextLink = nextButton.querySelector('a');
      if (nextLink) {
        nextLink.click();
        return true;
      }
    }
    return false;
  });

  if (temProximaPagina) {
    await page.waitForSelector('#DataTables_Table_0 tbody tr', { state: 'attached' });
    await page.waitForTimeout(2000);
    console.log('[irParaProximaPagina] Próxima página carregada com sucesso.');
    return true;
  } else {
    console.log('[irParaProximaPagina] Não há próxima página ou botão está desabilitado.');
    return false;
  }
};

// Endpoint principal para buscar os clientes do Saborite
router.get('/', async (req, res) => {
  const email = req.query.email || process.env.EMAIL_SABORITE || '';
  const senha = req.query.senha || process.env.SENHA_SABORITE || '';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`[GET /api/clientes-sab] Iniciando com email: ${email}`);

  try {
    if (!email || !senha) {
      console.log('[GET /api/clientes-sab] Erro: Email ou senha não fornecidos');
      return res.status(400).json({
        error: 'Credenciais ausentes',
        tipo: TIPOS_ERRO.CREDENCIAIS_AUSENTES,
        detalhes: 'Email e senha são obrigatórios para acessar esta rota',
        codigo: 400
      });
    }

    console.log('[GET /api/clientes-sab] Limpando cookies...');
    await context.clearCookies();

    console.log('[GET /api/clientes-sab] Navegando para página de login...');
    await page.goto('https://demonstracao.saborite.com/entrar/administracao/');
    await page.waitForLoadState('networkidle');

    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('input[name="email"]');
    });

    if (!isLoggedIn) {

      console.log('[GET /api/clientes-sab] Iniciando fluxo de login...');

      await page.click('a[class="btn btn-primary my-3"]');
      await page.waitForTimeout(1000);
      await page.click('input[name="email"]');
      await page.keyboard.type(email);
      await page.click('input[name="senha"]');
      await page.keyboard.type(senha);
      console.log('[GET /api/clientes-sab] Enviando formulário de login...');
      await page.click('input[type="submit"]');
      await page.waitForTimeout(3000); // Aguarda 3 segundos após o login
    } else {
      console.log('[GET /api/clientes-sab] Usuário já está logado');
    }

    await page.waitForLoadState('networkidle');
    console.log('[GET /api/clientes-sab] Navegando para a página de clientes...');
    await page.goto('https://demonstracao.saborite.com/adm/usuarios/lista/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Aguarda 2 segundos para garantir o carregamento

    // Captura o HTML da página para depuração
    const html = await page.content();
    fs.writeFileSync('pagina_clientes.html', html);
    console.log('[GET /api/clientes-sab] HTML da página salvo em "pagina_clientes.html".');

    const totalPaginas = await contarTotalDePaginas(page);
    let todosClientes = [];

    // Sempre começar da página 1
    console.log('[GET /api/clientes-sab] Garantindo que estamos na primeira página...');
    await irParaPrimeíraPagina(page);

    let paginaAtual = 1;
    let temMaisPaginas = true;

    while (temMaisPaginas) {
      console.log(`[GET /api/clientes-sab] Processando página ${paginaAtual} de ${totalPaginas}...`);

      const clientesDaPagina = await extrairClientesDaPagina(page);
      console.log(`[GET /api/clientes-sab] Encontrados ${clientesDaPagina.length} clientes na página ${paginaAtual}.`);

      todosClientes = [...todosClientes, ...clientesDaPagina];

      // Tentar ir para a próxima página
      if (paginaAtual < totalPaginas) {
        temMaisPaginas = await irParaProximaPagina(page);
        if (temMaisPaginas) {
          paginaAtual++;
        }
      } else {
        temMaisPaginas = false;
      }
    }

    console.log(`[GET /api/clientes-sab] Finalizada extração de ${todosClientes.length} clientes no total.`);
    await browser.close();

    return res.status(200).json({
      sucesso: true,
      clientes: todosClientes,
      total_clientes: todosClientes.length
    });

  } catch (error) {
    console.error(`[GET /api/clientes-sab] Erro durante a execução: ${error.message}`);

    try {
      await browser.close();
    } catch (e) {
      console.error(`[GET /api/clientes-sab] Erro ao fechar o navegador: ${e.message}`);
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