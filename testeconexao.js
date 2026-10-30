// Script simples para testar a conexão com o banco de dados PostgreSQL
const BD = require('./db');

async function testConnection() {
    try {
        const client = await BD.query('SELECT NOW()');
        console.log('Conexão com o banco de dados bem-sucedida:', client.rows[0]);
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
    } finally {
        await BD.end();
    }
}

testConnection();

