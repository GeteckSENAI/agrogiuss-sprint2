const express = require('express');
const router = express.Router();
const BD = require('../db');

// 1. Listar todas as movimentações de estoque (com JOIN de produtos e usuários)
router.get('/', async (req, res) => {
    try {
        const resultado = await BD.query(`
            SELECT 
                m.id_movimentacao,
                m.id_produto,
                p.nome AS nome_produto,
                m.id_usuario,
                u.nome AS nome_usuario,
                m.tipo,
                m.quantidade,
                m.observacao,
                m.data_movimentacao
            FROM movimentacoes_estoque m
            JOIN produtos p ON m.id_produto = p.id_produto
            JOIN usuarios u ON m.id_usuario = u.id_usuario
            ORDER BY m.id_movimentacao DESC
        `);
        res.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar movimentações de estoque:', erro);
        res.status(500).json({ erro: 'Erro interno ao listar movimentações de estoque' });
    }
});

// 2. Buscar movimentação por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await BD.query(`
            SELECT 
                m.id_movimentacao,
                m.id_produto,
                p.nome AS nome_produto,
                m.id_usuario,
                u.nome AS nome_usuario,
                m.tipo,
                m.quantidade,
                m.observacao,
                m.data_movimentacao
            FROM movimentacoes_estoque m
            JOIN produtos p ON m.id_produto = p.id_produto
            JOIN usuarios u ON m.id_usuario = u.id_usuario
            WHERE m.id_movimentacao = $1
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Movimentação não encontrada' });
        }
        res.status(200).json(resultado.rows[0]);
    } catch (erro) {
        console.error('Erro ao buscar movimentação:', erro);
        res.status(500).json({ erro: 'Erro interno ao buscar movimentação' });
    }
});

// 3. Cadastrar movimentação e atualizar estoque automaticamente
// Regra: Valida 'entrada'/'saida', impede estoque negativo e atualiza produtos.quantidade_estoque
router.post('/', async (req, res) => {
    const { id_produto, id_usuario, tipo, quantidade, observacao } = req.body;

    try {
        // Validações básicas de campos obrigatórios
        if (!id_produto || !id_usuario || !tipo || !quantidade) {
            return res.status(400).json({ 
                mensagem: 'Os campos id_produto, id_usuario, tipo e quantidade são obrigatórios' 
            });
        }

        // Validação do tipo de movimentação
        const tipoNormalizado = String(tipo).toLowerCase().trim();
        if (tipoNormalizado !== 'entrada' && tipoNormalizado !== 'saida') {
            return res.status(400).json({ 
                mensagem: "O tipo de movimentação deve ser exatamente 'entrada' ou 'saida'" 
            });
        }

        // Validação da quantidade positiva
        const qtd = parseInt(quantidade, 10);
        if (isNaN(qtd) || qtd <= 0) {
            return res.status(400).json({ 
                mensagem: 'A quantidade movimentada deve ser um número inteiro maior que zero' 
            });
        }

        // 1. Busca o produto para verificar o estoque atual
        const produtoConsulta = await BD.query(
            'SELECT id_produto, nome, quantidade_estoque FROM produtos WHERE id_produto = $1',
            [id_produto]
        );

        if (produtoConsulta.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Produto não encontrado' });
        }

        const produto = produtoConsulta.rows[0];
        let novoEstoque = 0;

        if (tipoNormalizado === 'entrada') {
            novoEstoque = produto.quantidade_estoque + qtd;
        } else {
            // Em caso de saída, impede que o estoque fique negativo
            if (produto.quantidade_estoque < qtd) {
                return res.status(400).json({ 
                    mensagem: `Estoque insuficiente para realizar esta saída. Estoque atual: ${produto.quantidade_estoque}, quantidade solicitada: ${qtd}` 
                });
            }
            novoEstoque = produto.quantidade_estoque - qtd;
        }

        // 2. Atualiza a quantidade_estoque na tabela produtos
        await BD.query(
            'UPDATE produtos SET quantidade_estoque = $1 WHERE id_produto = $2',
            [novoEstoque, id_produto]
        );

        // 3. Registra a movimentação no histórico
        const resultadoMovimentacao = await BD.query(
            `INSERT INTO movimentacoes_estoque (id_produto, id_usuario, tipo, quantidade, observacao)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id_produto, id_usuario, tipoNormalizado, qtd, observacao || null]
        );

        res.status(201).json({
            mensagem: 'Movimentação registrada e estoque atualizado com sucesso!',
            movimentacao: resultadoMovimentacao.rows[0],
            produto: {
                id_produto: produto.id_produto,
                nome: produto.nome,
                estoque_anterior: produto.quantidade_estoque,
                novo_estoque: novoEstoque
            }
        });

    } catch (erro) {
        console.error('Erro ao registrar movimentação de estoque:', erro);
        res.status(500).json({ erro: 'Erro interno ao processar movimentação de estoque' });
    }
});

module.exports = router;
