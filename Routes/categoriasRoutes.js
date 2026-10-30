const express = require('express');
const router = express.Router();
const BD = require('../db');

// 1. Listar todas as categorias
router.get('/', async (req, res) => {
    try {
        const resultado = await BD.query('SELECT * FROM categorias ORDER BY id_categoria ASC');
        res.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar categorias:', erro);
        res.status(500).json({ erro: 'Erro interno ao listar categorias' });
    }
});

// 2. Buscar categoria por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await BD.query('SELECT * FROM categorias WHERE id_categoria = $1', [id]);
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Categoria não encontrada' });
        }
        res.status(200).json(resultado.rows[0]);
    } catch (erro) {
        console.error('Erro ao buscar categoria:', erro);
        res.status(500).json({ erro: 'Erro interno ao buscar categoria' });
    }
});

// 3. Cadastrar nova categoria
router.post('/', async (req, res) => {
    const { nome, descricao, ativa } = req.body;
    try {
        if (!nome) {
            return res.status(400).json({ mensagem: 'O campo nome é obrigatório' });
        }

        const statusAtiva = ativa !== undefined ? ativa : true;

        const resultado = await BD.query(
            'INSERT INTO categorias (nome, descricao, ativa) VALUES ($1, $2, $3) RETURNING *',
            [nome, descricao || null, statusAtiva]
        );
        res.status(201).json({ mensagem: 'Categoria cadastrada com sucesso', categoria: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao cadastrar categoria:', erro);
        res.status(500).json({ erro: 'Erro interno ao cadastrar categoria' });
    }
});

// 4. Atualizar categoria existente por ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, ativa } = req.body;
    try {
        const resultado = await BD.query(
            `UPDATE categorias 
             SET nome = COALESCE($1, nome),
                 descricao = COALESCE($2, descricao),
                 ativa = COALESCE($3, ativa)
             WHERE id_categoria = $4 
             RETURNING *`,
            [nome, descricao, ativa, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Categoria não encontrada para atualizar' });
        }
        res.status(200).json({ mensagem: 'Categoria atualizada com sucesso', categoria: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao atualizar categoria:', erro);
        res.status(500).json({ erro: 'Erro interno ao atualizar categoria' });
    }
});

// 5. Excluir categoria por ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await BD.query('DELETE FROM categorias WHERE id_categoria = $1 RETURNING *', [id]);
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Categoria não encontrada para exclusão' });
        }
        res.status(200).json({ mensagem: 'Categoria excluída com sucesso', categoria: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao excluir categoria:', erro);
        res.status(500).json({ erro: 'Erro interno ao excluir categoria (verifique se há produtos vinculados)' });
    }
});

module.exports = router;
