const cron = require('node-cron');

let lastSyncTime = null;

// Função para buscar dados da API de forma assíncrona
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Função para sincronizar produtos
async function synchronizeProducts() {
    const url = 'https://api.marketplace.com/products'; // URL da API
    const products = await fetchData(url);
    if (products) {
        // Lógica para armazenar produtos no banco de dados
        // Implementar lógica de sincronização incremental baseada em lastSyncTime
        console.log('Produtos sincronizados:', products);
        lastSyncTime = new Date(); // Atualiza a hora da última sincronização
    }
}

// Agendar a sincronização para ser executada diariamente às 2 AM
cron.schedule('0 2 * * *', () => {
    console.log('Iniciando a sincronização de produtos...');
    synchronizeProducts();
});

module.exports = { synchronizeProducts };
