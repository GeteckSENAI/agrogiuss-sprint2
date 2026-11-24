const express = require('express');
const router = express.Router();
const BD = require('../db');

// 1. Listar todos os produtos (com JOIN para trazer nome da categoria)
router.get('/', async (req, res) => {
    try {
        const resultado = await BD.query(`
            SELECT 
                p.id_produto,
                p.id_categoria,
                c.nome AS nome_categoria,
                p.nome,
                p.observacao,
                p.quantidade_estoque,
                p.estoque_minimo,
                p.valor_custo,
                p.imagem_url,
                p.ativo,
                p.data_cadastro
            FROM produtos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            ORDER BY p.id_produto ASC
        `);
        res.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar produtos:', erro);
        res.status(500).json({ erro: 'Erro interno ao listar produtos' });
    }
});

// 2. Buscar produto por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await BD.query(`
            SELECT 
                p.id_produto,
                p.id_categoria,
                c.nome AS nome_categoria,
                p.nome,
                p.observacao,
                p.quantidade_estoque,
                p.estoque_minimo,
                p.valor_custo,
                p.imagem_url,
                p.ativo,
                p.data_cadastro
            FROM produtos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.id_produto = $1
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Produto não encontrado' });
        }
        res.status(200).json(resultado.rows[0]);
    } catch (erro) {
        console.error('Erro ao buscar produto:', erro);
        res.status(500).json({ erro: 'Erro interno ao buscar produto' });
    }
});

// 3. Cadastrar novo produto
router.post('/', async (req, res) => {
    const { 
        id_categoria, 
        nome, 
        observacao, 
        quantidade_estoque, 
        estoque_minimo, 
        valor_custo, 
        imagem_url, 
        ativo 
    } = req.body;

    try {
        if (!id_categoria || !nome || valor_custo === undefined) {
            return res.status(400).json({ mensagem: 'Os campos id_categoria, nome e valor_custo são obrigatórios' });
        }

        const qtdEstoque = quantidade_estoque !== undefined ? quantidade_estoque : 0;
        const estMinimo = estoque_minimo !== undefined ? estoque_minimo : 0;
        const statusAtivo = ativo !== undefined ? ativo : true;

        const resultado = await BD.query(
            `INSERT INTO produtos 
             (id_categoria, nome, observacao, quantidade_estoque, estoque_minimo, valor_custo, imagem_url, ativo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [id_categoria, nome, observacao || null, qtdEstoque, estMinimo, valor_custo, imagem_url || null, statusAtivo]
        );

        res.status(201).json({ mensagem: 'Produto cadastrado com sucesso', produto: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao cadastrar produto:', erro);
        res.status(500).json({ erro: 'Erro interno ao cadastrar produto' });
    }
});

// 4. Atualizar produto existente por ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        id_categoria, 
        nome, 
        observacao, 
        quantidade_estoque, 
        estoque_minimo, 
        valor_custo, 
        imagem_url, 
        ativo 
    } = req.body;

    try {
        const resultado = await BD.query(
            `UPDATE produtos 
             SET id_categoria = COALESCE($1, id_categoria),
                 nome = COALESCE($2, nome),
                 observacao = COALESCE($3, observacao),
                 quantidade_estoque = COALESCE($4, quantidade_estoque),
                 estoque_minimo = COALESCE($5, estoque_minimo),
                 valor_custo = COALESCE($6, valor_custo),
                 imagem_url = COALESCE($7, imagem_url),
                 ativo = COALESCE($8, ativo)
             WHERE id_produto = $9 
             RETURNING *`,
            [id_categoria, nome, observacao, quantidade_estoque, estoque_minimo, valor_custo, imagem_url, ativo, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Produto não encontrado para atualizar' });
        }
        res.status(200).json({ mensagem: 'Produto atualizado com sucesso', produto: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao atualizar produto:', erro);
        res.status(500).json({ erro: 'Erro interno ao atualizar produto' });
    }
});

// 5. Excluir produto por ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await BD.query('DELETE FROM produtos WHERE id_produto = $1 RETURNING *', [id]);
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Produto não encontrado para exclusão' });
        }
        res.status(200).json({ mensagem: 'Produto excluído com sucesso', produto: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao excluir produto:', erro);
        res.status(500).json({ erro: 'Erro interno ao excluir produto (verifique se há movimentações vinculadas)' });
    }
});

module.exports = router;
