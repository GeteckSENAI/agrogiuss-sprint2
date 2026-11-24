const express = require('express');
const router = express.Router();
const BD = require('../db');

// 1. Listar todos os usuários (sem expor hash de senha)
router.get('/', async (req, res) => {
    try {
        const resultado = await BD.query(`
            SELECT id_usuario, nome, email, ativo, data_cadastro 
            FROM usuarios 
            ORDER BY id_usuario ASC
        `);
        res.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar usuários:', erro);
        res.status(500).json({ erro: 'Erro interno ao listar usuários' });
    }
});

// 2. Buscar usuário por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await BD.query(`
            SELECT id_usuario, nome, email, ativo, data_cadastro 
            FROM usuarios 
            WHERE id_usuario = $1
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        }
        res.status(200).json(resultado.rows[0]);
    } catch (erro) {
        console.error('Erro ao buscar usuário:', erro);
        res.status(500).json({ erro: 'Erro interno ao buscar usuário' });
    }
});

// 3. Cadastrar novo usuário
router.post('/', async (req, res) => {
    const { nome, email, senha_hash, ativo } = req.body;
    try {
        if (!nome || !senha_hash) {
            return res.status(400).json({ mensagem: 'Os campos nome e senha_hash são obrigatórios' });
        }

        // Valida duplicidade de e-mail (caso informado)
        if (email) {
            const existe = await BD.query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);
            if (existe.rows.length > 0) {
                return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado' });
            }
        }

        const statusAtivo = ativo !== undefined ? ativo : true;

        const resultado = await BD.query(
            `INSERT INTO usuarios (nome, email, senha_hash, ativo)
             VALUES ($1, $2, $3, $4)
             RETURNING id_usuario, nome, email, ativo, data_cadastro`,
            [nome, email || null, senha_hash, statusAtivo]
        );

        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso', usuario: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao cadastrar usuário:', erro);
        res.status(500).json({ erro: 'Erro interno ao cadastrar usuário' });
    }
});

// 4. Atualizar usuário existente por ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha_hash, ativo } = req.body;
    try {
        // Valida se novo e-mail já pertence a outro usuário
        if (email) {
            const existe = await BD.query(
                'SELECT id_usuario FROM usuarios WHERE email = $1 AND id_usuario != $2',
                [email, id]
            );
            if (existe.rows.length > 0) {
                return res.status(409).json({ mensagem: 'Este e-mail já está em uso por outro usuário' });
            }
        }

        const resultado = await BD.query(
            `UPDATE usuarios 
             SET nome = COALESCE($1, nome),
                 email = COALESCE($2, email),
                 senha_hash = COALESCE($3, senha_hash),
                 ativo = COALESCE($4, ativo)
             WHERE id_usuario = $5 
             RETURNING id_usuario, nome, email, ativo, data_cadastro`,
            [nome, email, senha_hash, ativo, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado para atualizar' });
        }
        res.status(200).json({ mensagem: 'Usuário atualizado com sucesso', usuario: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao atualizar usuário:', erro);
        res.status(500).json({ erro: 'Erro interno ao atualizar usuário' });
    }
});

// 5. Excluir usuário por ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await BD.query(
            'DELETE FROM usuarios WHERE id_usuario = $1 RETURNING id_usuario, nome, email',
            [id]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado para exclusão' });
        }
        res.status(200).json({ mensagem: 'Usuário excluído com sucesso', usuario: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao excluir usuário:', erro);
        res.status(500).json({ erro: 'Erro interno ao excluir usuário (verifique se há movimentações vinculadas)' });
    }
});

module.exports = router;
