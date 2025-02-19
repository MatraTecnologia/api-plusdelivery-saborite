import {  NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const dynamic = 'force-dynamic'; // Isso força o Next.js a tratar como dinâmico

// Manipulador para o método GET
// Manipulador para o método GET
export async function GET() {
  try {
    const browser = await chromium.launch({ headless: false }); // `headless: false` é útil para debugging
    const page = await browser.newPage();

    // Realizando o login
    await page.goto('https://minhaloja.plusdelivery.com.br/admin/login/');
    await page.fill('#login', process.env.EMAIL!);
    await page.fill('#senha', process.env.SENHA!
    );
    await page.click('.btn.btn-lg.btn-success.btn-block');

    // Esperar a página carregar completamente após o login
    await page.waitForSelector('.navbar-brand');  // Verifica se o login foi bem-sucedido com a presença do seletor
    const count = await page.locator('.navbar-brand').count();
    if (count > 0) {
        console.log('Login bem-sucedido!');
    } else {
        console.log('Falha no login ou o seletor não foi encontrado.');
        await browser.close();
        return NextResponse.json({ error: 'Falha no login' }, { status: 400 });
    }

    // Esperar 5 segundos para garantir que a tabela seja carregada
    console.log('Aguardando 5 segundos para carregar a tabela...');
    await page.waitForTimeout(5000);  // Ajuste de 15 para 5 segundos (adequado para o carregamento)

    // Coletar os pedidos da tabela
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
                    detalhes: null, // Inicializa o campo detalhes
                };

                pedidosArray.push(pedido);
            }
        }
        return pedidosArray;
    });

    // Limitar os pedidos para apenas os 5 primeiros
    const pedidosLimitados = pedidos.slice(0, 5); // Pega os 5 primeiros pedidos

    // Array que vai armazenar todos os pedidos com seus detalhes completos
    const pedidosArrayFinal = [];

    for (const pedido of pedidosLimitados) {
        console.log(`Coletando detalhes para o pedido #${pedido.id}`);
        
        // Clica na linha do pedido usando o identificador
        const linhaPedido = await page.locator(`#btnDetalhePedido[identificacao="${pedido.id}"]`);
        await linhaPedido.click(); // Clica na linha
await page.waitForTimeout(2000)
        // Espera a visualização detalhada carregar
        await page.waitForSelector('.ta_visualizar_pedido', { timeout: 10000 });

        // Coleta os dados do painel de detalhes
        const detalhes = await page.$eval('.ta_visualizar_pedido', (div) => {
            return div.innerHTML.trim();
        });
        console.log(detalhes);

        // Cria um novo objeto de pedido com os detalhes corretamente preenchidos
        const pedidoNow = {
            id: pedido.id,
            cliente: pedido.cliente,
            dataHora: pedido.dataHora,
            status: pedido.status,
            detalhes: detalhes // Detalhes associados corretamente
        };

        pedidosArrayFinal.push(pedidoNow);

        // Aguarda 1 segundo antes de continuar para o próximo pedido
        await page.waitForTimeout(1000);
    }

    await browser.close();

    // Retorna os pedidos com detalhes para o front-end
    return NextResponse.json(pedidosArrayFinal);
  } catch (error) {
    console.error('Erro ao coletar os pedidos:', error);
    return NextResponse.json({ error: 'Falha ao coletar os pedidos' }, { status: 500 });
  }
}
