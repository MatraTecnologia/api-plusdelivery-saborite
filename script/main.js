const express = require('express');
const { chromium } = require('playwright'); // O script que você quer rodar
const app = express();
const port = 3000;

// Função que irá rodar o script
async function runScript() {
    console.log("Iniciando o script...");

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // A partir daqui, você pode incluir o seu código Playwright, por exemplo:
    await page.goto('https://minhaloja.plusdelivery.com.br/admin/login/');
    await page.fill('#login', 'elzalanches2019@gmail.com');
    await page.fill('#senha', 'Elza@270915');
    await page.click('.btn.btn-lg.btn-success.btn-block');

    await page.waitForTimeout(5000);
    const count = await page.locator('.navbar-brand').count();
    if (count > 0) {
        console.log('Login bem-sucedido!');
    } else {
        console.log('Falha no login ou o seletor não foi encontrado.');
    }

    // Fechar o navegador
    await browser.close();
}

// Endpoint que acionará o script
app.get('/run-script', async (req, res) => {
    try {
        await runScript();
        res.send('Script executado com sucesso!');
    } catch (error) {
        console.error('Erro ao executar o script:', error);
        res.status(500).send('Erro ao executar o script.');
    }
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
