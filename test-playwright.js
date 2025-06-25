const { chromium } = require('playwright');
const fs = require('fs');

const extrairVariacoesDoProduto = async (page) => {
  console.log('Extraindo variações do produto...');

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

const extrairOpcionaisDoProduto = async (page) => {
  console.log('Extraindo grupos de opcionais do produto...');

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

const extrairProdutosDaPagina = async (page) => {
  console.log('Extraindo dados dos produtos da página atual...');

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
        imagem: 'https://demonstracao.saborite.com' + imagem,
        variacoes: [], // Será preenchido posteriormente
        opcionais: []  // Será preenchido posteriormente
      });
    });

    return result;
  });

  return produtos;
};

const extrairDetalhesDosProdutos = async (page, produtos) => {
  console.log(`Extraindo detalhes de ${produtos.length} produtos...`);

  // Para cada produto, extrai as variações e opcionais
  for (let i = 0; i < produtos.length; i++) {
    const produto = produtos[i];
    console.log(`Extraindo detalhes do produto ${i + 1}/${produtos.length}: ${produto.nome} (ID: ${produto.id})`);

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
      console.error(`Erro ao extrair detalhes do produto ${produto.nome} (ID: ${produto.id}):`, error);
    }
  }
};

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

const irParaPagina = async (page, numeroPagina) => {
  console.log(`Navegando para a página ${numeroPagina}...`);

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
    console.log(`Não foi possível navegar diretamente para a página ${numeroPagina}, tentando "Próxima"...`);

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
      console.log('Não foi possível navegar para a próxima página.');
      return false;
    }
  }

  return true;
};

const extrairProdutos = async (page) => {
  console.log('Iniciando extração de produtos de todas as páginas...');

  // Obtém o número total de páginas
  const totalPaginas = await contarTotalDePaginas(page);
  console.log(`Total de páginas encontradas: ${totalPaginas}`);

  let todosProdutos = [];

  // Itera por todas as páginas
  for (let paginaAtual = 1; paginaAtual <= totalPaginas; paginaAtual++) {
    console.log(`Processando página ${paginaAtual} de ${totalPaginas}...`);

    // Se não for a primeira página, navega para ela
    if (paginaAtual > 1) {
      const paginaAlcancada = await irParaPagina(page, paginaAtual);
      if (!paginaAlcancada) break; // Se não conseguir navegar, para o loop
    }

    // Extrai os produtos da página atual
    const produtosDaPagina = await extrairProdutosDaPagina(page);
    console.log(`Encontrados ${produtosDaPagina.length} produtos na página ${paginaAtual}.`);

    // Extrai os detalhes de cada produto
    await extrairDetalhesDosProdutos(page, produtosDaPagina);

    // Adiciona aos produtos totais
    todosProdutos = [...todosProdutos, ...produtosDaPagina];
  }

  console.log(`Finalizada extração de detalhes de ${todosProdutos.length} produtos no total.`);
  return todosProdutos;
};

const editarProduto = async (page, produto) => {
  console.log(`Editando produto: ${produto.nome} (ID: ${produto.id})`);

  // Clicar no botão de editar
  await page.evaluate((produtoId) => {
    const editButton = document.querySelector(`button[onclick*="setProduto({id: ${produtoId}});"]`);
    if (editButton) {
      editButton.click();
    }
  }, produto.id);

  // Aguardar o modal abrir
  await page.waitForSelector('.modal-content', { state: 'visible' });

  // Preencher os campos do formulário
  await page.fill('#nome', produto.nome);

  if (produto.descricao) {
    await page.fill('#descricao', produto.descricao);
  }

  // Converter preço para formato correto se necessário
  const preco = produto.preco.replace(',', '.');
  await page.fill('input[name="preco"]', preco);

  // Definir status
  const statusCheckbox = await page.$('#status');
  const isChecked = await statusCheckbox.isChecked();

  if ((produto.ativo && !isChecked) || (!produto.ativo && isChecked)) {
    await statusCheckbox.click();
  }

  // Se o produto tem variações, preenche elas
  if (produto.variacoes && produto.variacoes.length > 0) {
    // Clica na tab de variações
    await page.click('a[href="#variacoesTab"]');
    await page.waitForTimeout(300);

    // Preenche cada variação
    for (let i = 0; i < produto.variacoes.length && i < 5; i++) {
      const variacao = produto.variacoes[i];
      const sufixo = i === 0 ? '' : (i + 1);

      if (variacao.descricao && variacao.descricao !== 'Padrão') {
        await page.fill(`input[name="tamanho${sufixo}"]`, variacao.descricao);
      }

      if (variacao.qtd_atacado) {
        await page.fill(`input[name="qtd_atacado${sufixo}"]`, variacao.qtd_atacado);
      }

      if (variacao.preco_atacado) {
        await page.fill(`input[name="preco_atacado${sufixo}"]`, variacao.preco_atacado);
      }

      if (variacao.preco_custo) {
        await page.fill(`input[name="preco_custo${sufixo}"]`, variacao.preco_custo);
      }

      if (variacao.preco) {
        await page.fill(`input[name="preco${sufixo}"]`, variacao.preco);
      }
    }
  }

  // Se o produto tem opcionais, marca eles
  if (produto.opcionais && produto.opcionais.length > 0) {
    // Clica na tab de opcionais
    await page.click('a[href="#opcionaisTab"]');
    await page.waitForTimeout(300);

    // Marca cada opcional
    for (const opcional of produto.opcionais) {
      const checkbox = await page.$(`#adc${opcional.id}`);
      if (checkbox) {
        const isChecked = await checkbox.isChecked();
        if (!isChecked) {
          await checkbox.check();
        }
      }
    }
  }

  // Salvar as alterações
  await page.click('button.btn-primary[type="submit"]');

  // Aguardar o modal fechar
  await page.waitForSelector('.modal-content', { state: 'hidden' });

  console.log(`Produto ${produto.nome} atualizado com sucesso.`);
};

const restaurarProdutos = async (page, produtos) => {
  console.log('Iniciando restauração dos produtos...');

  for (const produto of produtos) {
    try {
      await editarProduto(page, produto);
      // Aguardar um pouco entre as atualizações para não sobrecarregar o servidor
      await page.waitForTimeout(1000);
    } catch (error) {
      console.error(`Erro ao atualizar o produto ${produto.nome} (ID: ${produto.id}):`, error);
    }
  }

  console.log('Restauração de produtos concluída.');
};

const testPlaywright = async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://demonstracao.saborite.com/entrar/administracao/');
    await page.waitForLoadState('networkidle');

    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('input[name="email"]');
    });

    if (!isLoggedIn) {
      await page.waitForLoadState('networkidle');
      console.log('Usuário não está logado. Iniciando fluxo de login...');
      await page.click('a[class="btn btn-primary my-3"]');
      await page.waitForTimeout(8000);
      console.log('Preenchendo o email...');
      await page.click('input[name="email"]');
      await page.waitForTimeout(100);
      await page.keyboard.type("varela.suporte@gmail.com");
      await page.waitForTimeout(100);
      console.log('Preenchendo a senha...');
      await page.click('input[name="senha"]');
      await page.waitForTimeout(100);
      await page.keyboard.type("Varela123mafra");
      await page.waitForTimeout(100);
      console.log('Clicando no botão de login...');
      await page.click('input[type="submit"]');
      await page.waitForTimeout(1000);
    } else {
      console.log('Usuário já está logado. Prosseguindo com o fluxo...');
    }

    await page.waitForLoadState('networkidle');
    console.log('Página carregada com sucesso!');
    await page.goto('https://demonstracao.saborite.com/adm/produtos/lista/');
    await page.waitForLoadState('networkidle');

    // Extrair os dados dos produtos
    const produtos = await extrairProdutos(page);

    // Salva os dados em um arquivo JSON
    fs.writeFileSync('produtos-saborite.json', JSON.stringify(produtos, null, 2));
    console.log('Dados salvos com sucesso no arquivo produtos-saborite.json');

    // Se quiser restaurar produtos de um arquivo JSON
    // const produtosParaRestaurar = JSON.parse(fs.readFileSync('produtos-saborite.json', 'utf8'));
    // await restaurarProdutos(page, produtosParaRestaurar);

  } catch (error) {
    console.error('Erro durante a execução:', error);
  } finally {
    await browser.close();
  }
};

// Função principal que decide qual operação realizar
const main = async () => {
  const args = process.argv.slice(2);
  const comando = args[0];

  if (comando === 'extrair') {
    await testPlaywright();
  } else if (comando === 'restaurar') {
    const arquivoJson = args[1] || 'produtos-saborite.json';

    // Verificar se o arquivo existe
    if (!fs.existsSync(arquivoJson)) {
      console.error(`Arquivo ${arquivoJson} não encontrado.`);
      return;
    }

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Login e navegação para a página de produtos
      await page.goto('https://demonstracao.saborite.com/entrar/administracao/');
      await page.waitForLoadState('networkidle');

      const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('input[name="email"]');
      });

      if (!isLoggedIn) {
        await page.waitForLoadState('networkidle');
        console.log('Usuário não está logado. Iniciando fluxo de login...');
        await page.waitForTimeout(8000);
        console.log('Preenchendo o email...');
        await page.click('input[name="email"]');
        await page.waitForTimeout(100);
        await page.keyboard.type("varela.suporte@gmail.com");
        await page.waitForTimeout(100);
        console.log('Preenchendo a senha...');
        await page.click('input[name="senha"]');
        await page.waitForTimeout(100);
        await page.keyboard.type("Varela123mafra");
        await page.waitForTimeout(100);
        console.log('Clicando no botão de login...');
        await page.click('input[type="submit"]');
        await page.waitForTimeout(1000);
      } else {
        console.log('Usuário já está logado. Prosseguindo com o fluxo...');
      }

      await page.waitForLoadState('networkidle');
      console.log('Página carregada com sucesso!');
      await page.goto('https://demonstracao.saborite.com/adm/produtos/lista/');
      await page.waitForLoadState('networkidle');

      // Carregar produtos do arquivo JSON
      const produtosParaRestaurar = JSON.parse(fs.readFileSync(arquivoJson, 'utf8'));

      // Restaurar produtos
      await restaurarProdutos(page, produtosParaRestaurar);

    } catch (error) {
      console.error('Erro durante a execução:', error);
    } finally {
      await browser.close();
    }
  } else {
    console.log(`
Uso: node test-playwright.js [comando] [opções]

Comandos disponíveis:
  extrair              Extrai todos os produtos do Saborite e salva em JSON
  restaurar [arquivo]  Restaura os produtos do arquivo JSON (padrão: produtos-saborite.json)

Exemplos:
  node test-playwright.js extrair
  node test-playwright.js restaurar produtos-saborite.json
    `);
  }
};

// Executa a função principal
if (require.main === module) {
  main();
} 