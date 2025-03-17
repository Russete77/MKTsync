const fs = require('fs');

// Função para adicionar logs detalhados
function logDetails(message) {
    const logMessage = `${new Date().toISOString()} - ${message}\n`;
    fs.appendFileSync('app.log', logMessage);
}

// Exemplo de uso
logDetails('Iniciando a sincronização de produtos.');

module.exports = { logDetails };
