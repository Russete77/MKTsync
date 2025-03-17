const NodeCache = require('node-cache');
const reportCache = new NodeCache();

// Função para gerar relatórios
async function generateReport() {
    // Verifique se o relatório já está em cache
    const cachedReport = reportCache.get('salesReport');
    if (cachedReport) {
        console.log('Usando relatório em cache');
        return cachedReport;
    }

    // Simulação de consulta SQL para gerar o relatório
    const reportData = await fetchSalesData(); // Substitua por sua consulta SQL real

    // Armazena o relatório em cache por 1 hora
    reportCache.set('salesReport', reportData, 3600);
    console.log('Relatório gerado e armazenado em cache');
    return reportData;
}

// Função simulada para buscar dados de vendas
async function fetchSalesData() {
    // Aqui você deve implementar a consulta SQL real
    return [{ product: 'Produto A', sales: 100 }, { product: 'Produto B', sales: 200 }];
}

module.exports = { generateReport };
