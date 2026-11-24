// Script para testar a conexão e garantir que tabelas, colunas e contas padrão existam no PostgreSQL
const fs = require('fs');
const path = require('path');
const BD = require('./db');

async function testConnection() {
    try {
        const client = await BD.query('SELECT NOW()');
        console.log('Conexão com o banco de dados bem-sucedida:', client.rows[0]);

        const sqlPath = path.join(__dirname, 'Dados', 'banco.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await BD.query(sql);

        // Garante permissões e imagens das categorias conforme os protótipos
        await BD.query("UPDATE usuarios SET tipo = 'admin' WHERE id_usuario IN (1, 2)");
        await BD.query("UPDATE produtos SET quantidade_estoque = 63 WHERE id_produto = 2");
        await BD.query("UPDATE produtos SET quantidade_estoque = 102 WHERE id_produto = 3");
        await BD.query("UPDATE produtos SET quantidade_estoque = 12, estoque_minimo = 12 WHERE id_produto = 4");
        await BD.query("UPDATE produtos SET quantidade_estoque = 5, estoque_minimo = 10 WHERE id_produto = 5");
        await BD.query("UPDATE produtos SET quantidade_estoque = 60 WHERE id_produto = 6");

        const catImages = [
            [1, '/img/pa-construcao.png'],
            [2, '/img/adubo-npk.png'],
            [3, 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80'],
            [4, '/img/special-dog.png'],
            [5, '/img/molinete-pesca.png'],
            [6, 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=600&q=80'],
            [7, 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=80'],
            [8, '/img/tinta-lukscolor.png'],
            [9, 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80'],
            [10, '/img/pa-construcao.png']
        ];
        for (const [id, img] of catImages) {
            await BD.query('UPDATE categorias SET imagem_url = COALESCE(imagem_url, $1) WHERE id_categoria = $2', [img, id]);
        }

        // Sincroniza sequências
        await BD.query("SELECT setval('usuarios_id_usuario_seq', COALESCE((SELECT MAX(id_usuario) FROM usuarios), 1))");
        await BD.query("SELECT setval('categorias_id_categoria_seq', COALESCE((SELECT MAX(id_categoria) FROM categorias), 1))");
        await BD.query("SELECT setval('produtos_id_produto_seq', COALESCE((SELECT MAX(id_produto) FROM produtos), 1))");

        // Insere movimentações iniciais se a tabela estiver vazia
        const movCount = await BD.query('SELECT COUNT(*) FROM movimentacoes_estoque');
        if (parseInt(movCount.rows[0].count, 10) === 0) {
            await BD.query(`
                INSERT INTO movimentacoes_estoque (id_produto, id_usuario, tipo, quantidade, observacao) VALUES
                (1, 1, 'entrada', 10, 'Produto cadastrado: Pá de construção'),
                (4, 1, 'entrada', 12, 'Estoque ajustado: Adubo 5kg'),
                (5, 2, 'saida', 3, 'Saída registrada: Molinete de pesca')
            `);
        }

        const usuarios = await BD.query('SELECT id_usuario, nome, email, tipo, ativo FROM usuarios ORDER BY id_usuario');
        console.log('Usuários disponíveis:', usuarios.rows);
    } catch (error) {
        console.error('Erro ao conectar/configurar o banco de dados:', error);
    } finally {
        await BD.end();
    }
}

testConnection();
