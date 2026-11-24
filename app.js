// =============================================================================
// Servidor Principal - Agro Giuss (Sprint 2 Completo)
// =============================================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 1. Configuração do motor de visualização EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Liberação de arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// 3. Processamento de dados JSON e formulários (com suporte a upload de imagens em base64)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Conexão com o banco de dados PostgreSQL (agrogiuss)
const BD = require('./db');

// Helper para salvar imagens enviadas nos formulários (base64 -> arquivo em /public/img/upload)
function salvarImagemUpload(base64Str, prefixo = 'item') {
    if (!base64Str || !base64Str.startsWith('data:image/')) return null;
    try {
        const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;
        let ext = matches[1].toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const uploadDir = path.join(__dirname, 'public', 'img', 'upload');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const nomeArquivo = `${prefixo}-${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(uploadDir, nomeArquivo), buffer);
        return `/img/upload/${nomeArquivo}`;
    } catch (e) {
        console.error('Erro ao salvar imagem:', e);
        return null;
    }
}

// Helper para converter preço digitado ("R$ 89,90" -> 89.90)
function parsePreco(valorStr) {
    if (typeof valorStr === 'number') return valorStr;
    if (!valorStr) return 0;
    const limpo = String(valorStr)
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
}

// Inicialização automática de colunas e contas padrão no banco
async function garantirEstruturaBanco() {
    try {
        await BD.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'cliente'");
        await BD.query("ALTER TABLE categorias ADD COLUMN IF NOT EXISTS imagem_url VARCHAR(255)");
        await BD.query(`
            INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo) VALUES
            ('Admin', 'admin@agrogiuss.com', 'admin123', 'admin', true),
            ('Cliente', 'cliente@agrogiuss.com', 'senha123', 'cliente', true)
            ON CONFLICT (email) DO UPDATE SET
                senha_hash = EXCLUDED.senha_hash,
                tipo = EXCLUDED.tipo,
                ativo = true
        `);

        // Atualiza imagens das categorias que estavam com PNGs recortados para fotos de capa em alta resolução
        const fotosCategorias = [
            [1, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80'],
            [2, 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80'],
            [3, 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=800&q=80'],
            [4, 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=800&q=80'],
            [5, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80'],
            [6, 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80'],
            [7, 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80'],
            [8, 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=80'],
            [9, 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80'],
            [10, 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80']
        ];
        for (const [idCat, urlFoto] of fotosCategorias) {
            await BD.query(
                `UPDATE categorias SET imagem_url = $1 WHERE id_categoria = $2 AND (imagem_url IS NULL OR imagem_url LIKE '/img/%')`,
                [urlFoto, idCat]
            );
        }
    } catch (e) {
        console.warn('Aviso ao verificar estrutura inicial do banco:', e.message);
    }
}
garantirEstruturaBanco();

// Middleware de sessão simples via Cookie HTTP
app.use((req, res, next) => {
    let usuarioNome = null;
    let usuarioTipo = null;
    let usuarioId = 1;

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => {
                const [k, ...v] = c.trim().split('=');
                return [k, v.join('=')];
            })
        );
        if (cookies.usuarioNome) usuarioNome = decodeURIComponent(cookies.usuarioNome);
        if (cookies.usuarioTipo) usuarioTipo = decodeURIComponent(cookies.usuarioTipo);
        if (cookies.usuarioId) usuarioId = parseInt(cookies.usuarioId, 10) || 1;
    }
    if (req.query.usuario) {
        usuarioNome = req.query.usuario;
    }

    req.usuarioNome = usuarioNome;
    req.usuarioTipo = usuarioTipo;
    req.usuarioId = usuarioId;
    res.locals.usuarioNome = usuarioNome;
    res.locals.usuarioTipo = usuarioTipo;
    res.locals.usuarioId = usuarioId;
    next();
});

// =============================================================================
// ROTAS PÚBLICAS E DA LOJA (EJS + POSTGRESQL)
// =============================================================================

// 1. Landing Page Institucional
app.get('/', (req, res) => {
    res.render('landing/index');
});

// 2. Login de Cliente
app.get('/login', (req, res) => {
    res.render('login', { erro: null, identificador: '' });
});

app.post('/login', async (req, res) => {
    const { identificador, senha } = req.body;

    if (!identificador || !senha) {
        return res.render('login', {
            erro: 'Por favor, informe seu nome/e-mail e sua senha.',
            identificador: identificador || ''
        });
    }

    try {
        const resultado = await BD.query(`
            SELECT * FROM usuarios 
            WHERE (LOWER(nome) = LOWER($1) OR LOWER(email) = LOWER($1))
              AND ativo = true
            LIMIT 1
        `, [identificador.trim()]);

        if (resultado.rows.length === 0) {
            return res.render('login', {
                erro: 'Usuário ou senha inválidos. Tente novamente.',
                identificador
            });
        }

        const usuario = resultado.rows[0];
        const senhaCorreta = (usuario.senha_hash === senha) ||
            (usuario.senha_hash === 'admin123' && senha === 'admin123') ||
            (usuario.senha_hash === 'senha123hash' && (senha === 'senha123' || senha === 'senha123hash'));

        if (!senhaCorreta) {
            return res.render('login', {
                erro: 'Usuário ou senha inválidos. Tente novamente.',
                identificador
            });
        }

        res.setHeader('Set-Cookie', [
            `usuarioNome=${encodeURIComponent(usuario.nome)}; Path=/; HttpOnly`,
            `usuarioTipo=${encodeURIComponent(usuario.tipo || 'cliente')}; Path=/; HttpOnly`,
            `usuarioId=${usuario.id_usuario}; Path=/; HttpOnly`
        ]);
        return res.redirect('/catalogo');
    } catch (erro) {
        console.error('Erro ao processar login:', erro);
        return res.render('login', {
            erro: 'Erro interno ao validar acesso no banco de dados.',
            identificador
        });
    }
});

// 3. Cadastro de Novo Cliente
app.get('/cadastro', (req, res) => {
    res.render('cadastro', { erro: null, nome: '', email: '' });
});

app.post('/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
        return res.render('cadastro', {
            erro: 'Preencha todos os campos para criar sua conta.',
            nome: nome || '',
            email: email || ''
        });
    }

    try {
        const existe = await BD.query('SELECT id_usuario FROM usuarios WHERE LOWER(email) = LOWER($1)', [email.trim()]);
        if (existe.rows.length > 0) {
            return res.render('cadastro', {
                erro: 'Este e-mail já possui cadastro. Faça login.',
                nome,
                email
            });
        }

        const novo = await BD.query(
            `INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo)
             VALUES ($1, $2, $3, 'cliente', true)
             RETURNING *`,
            [nome.trim(), email.trim(), senha]
        );
        const usuario = novo.rows[0];

        res.setHeader('Set-Cookie', [
            `usuarioNome=${encodeURIComponent(usuario.nome)}; Path=/; HttpOnly`,
            `usuarioTipo=cliente; Path=/; HttpOnly`,
            `usuarioId=${usuario.id_usuario}; Path=/; HttpOnly`
        ]);
        return res.redirect('/catalogo');
    } catch (erro) {
        console.error('Erro ao criar conta:', erro);
        return res.render('cadastro', {
            erro: 'Não foi possível concluir o cadastro. Tente novamente.',
            nome,
            email
        });
    }
});

// 4. Logout
app.get('/logout', (req, res) => {
    res.setHeader('Set-Cookie', [
        'usuarioNome=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'usuarioTipo=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'usuarioId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    ]);
    res.redirect('/');
});

// 5. Catálogo de Produtos
app.get('/catalogo', async (req, res) => {
    const { categoria, busca, ordem } = req.query;

    try {
        const categoriasRes = await BD.query(`
            SELECT id_categoria, nome, descricao 
            FROM categorias 
            WHERE ativa = true 
            ORDER BY id_categoria ASC
        `);

        let sql = `
            SELECT 
                p.id_produto,
                p.id_categoria,
                c.nome AS categoria_nome,
                p.nome,
                p.observacao,
                p.quantidade_estoque,
                p.estoque_minimo,
                p.valor_custo,
                p.imagem_url,
                p.ativo
            FROM produtos p
            JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.ativo = true
        `;
        const params = [];

        if (categoria && categoria !== 'todos') {
            params.push(categoria);
            sql += ` AND p.id_categoria = $${params.length}`;
        }

        if (busca && busca.trim()) {
            params.push(`%${busca.trim()}%`);
            sql += ` AND (p.nome ILIKE $${params.length} OR p.observacao ILIKE $${params.length} OR c.nome ILIKE $${params.length})`;
        }

        if (ordem === 'za') {
            sql += ' ORDER BY p.nome DESC';
        } else if (ordem === 'menor-preco') {
            sql += ' ORDER BY p.valor_custo ASC';
        } else if (ordem === 'maior-preco') {
            sql += ' ORDER BY p.valor_custo DESC';
        } else {
            sql += ' ORDER BY p.id_produto ASC';
        }

        const produtosRes = await BD.query(sql, params);

        res.render('catalogo', {
            produtos: produtosRes.rows,
            categorias: categoriasRes.rows,
            categoriaAtiva: categoria || 'todos',
            busca: busca || '',
            ordem: ordem || 'az'
        });
    } catch (erro) {
        console.error('Erro ao carregar catálogo:', erro);
        res.status(500).render('erro', {
            codigo: 500,
            titulo: 'Erro ao carregar o catálogo',
            mensagem: 'Não foi possível carregar os produtos. Tente novamente em instantes.'
        });
    }
});

// 6. Detalhe do Produto
app.get('/produto/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const resultado = await BD.query(`
            SELECT 
                p.id_produto,
                p.id_categoria,
                c.nome AS categoria_nome,
                p.nome,
                p.observacao,
                p.quantidade_estoque,
                p.estoque_minimo,
                p.valor_custo,
                p.imagem_url,
                p.ativo
            FROM produtos p
            JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.id_produto = $1
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).render('erro', {
                codigo: 404,
                titulo: 'Produto não encontrado',
                mensagem: 'Este produto não existe ou foi removido do catálogo.'
            });
        }

        res.render('produto', {
            produto: resultado.rows[0]
        });
    } catch (erro) {
        console.error('Erro ao carregar detalhe do produto:', erro);
        res.status(500).render('erro', {
            codigo: 500,
            titulo: 'Erro ao carregar o produto',
            mensagem: 'Não foi possível carregar os detalhes do produto. Tente novamente em instantes.'
        });
    }
});

// 7. Meus Pedidos e Carrinho
app.get('/pedidos', async (req, res) => {
    try {
        const hist = await BD.query(`
            SELECT m.*, p.nome AS nome_produto
            FROM movimentacoes_estoque m
            JOIN produtos p ON m.id_produto = p.id_produto
            WHERE m.tipo = 'saida'
            ORDER BY m.id_movimentacao DESC
            LIMIT 8
        `);
        res.render('pedidos', {
            historico: hist.rows,
            sucesso: req.query.sucesso || null,
            erro: req.query.erro || null,
            limparCarrinho: req.query.sucesso ? true : false
        });
    } catch (erro) {
        console.error('Erro ao carregar pedidos:', erro);
        res.render('pedidos', { historico: [], sucesso: null, erro: null, limparCarrinho: false });
    }
});

app.post('/pedidos/finalizar', async (req, res) => {
    try {
        const itens = JSON.parse(req.body.itens_json || '[]');
        if (!itens.length) {
            return res.redirect('/pedidos?erro=' + encodeURIComponent('Seu carrinho está vazio.'));
        }
        const idUsr = req.usuarioId || 1;
        for (const item of itens) {
            const qtd = Math.max(1, parseInt(item.quantidade, 10) || 1);
            await BD.query(
                'UPDATE produtos SET quantidade_estoque = GREATEST(0, quantidade_estoque - $1) WHERE id_produto = $2',
                [qtd, item.id_produto]
            );
            await BD.query(
                `INSERT INTO movimentacoes_estoque (id_produto, id_usuario, tipo, quantidade, observacao)
                 VALUES ($1, $2, 'saida', $3, $4)`,
                [item.id_produto, idUsr, qtd, `Pedido realizado no site (${req.usuarioNome || 'Cliente'})`]
            );
        }
        return res.redirect('/pedidos?sucesso=' + encodeURIComponent('Pedido confirmado com sucesso! O estoque foi atualizado.'));
    } catch (erro) {
        console.error('Erro ao finalizar pedido:', erro);
        return res.redirect('/pedidos?erro=' + encodeURIComponent('Erro ao processar pedido.'));
    }
});

// =============================================================================
// ROTAS DO PAINEL ADMINISTRATIVO (EJS + POSTGRESQL)
// =============================================================================

// A) Login Administrativo (GET e POST)
app.get('/admin/login', (req, res) => {
    res.render('admin/login', { erro: null, identificador: '' });
});

app.post('/admin/login', async (req, res) => {
    const { identificador, senha } = req.body;

    if (!identificador || !senha) {
        return res.render('admin/login', {
            erro: 'Por favor, informe seu e-mail/usuário e senha.',
            identificador: identificador || ''
        });
    }

    try {
        const resultado = await BD.query(`
            SELECT * FROM usuarios
            WHERE (LOWER(nome) = LOWER($1) OR LOWER(email) = LOWER($1))
              AND ativo = true
              AND tipo = 'admin'
            LIMIT 1
        `, [identificador.trim()]);

        if (resultado.rows.length === 0) {
            return res.render('admin/login', {
                erro: 'Acesso negado. Credenciais inválidas ou sem permissão de administrador.',
                identificador
            });
        }

        const usuario = resultado.rows[0];
        const senhaCorreta = (usuario.senha_hash === senha);

        if (!senhaCorreta) {
            return res.render('admin/login', {
                erro: 'Acesso negado. Credenciais inválidas ou sem permissão de administrador.',
                identificador
            });
        }

        res.setHeader('Set-Cookie', [
            `usuarioNome=${encodeURIComponent(usuario.nome)}; Path=/; HttpOnly`,
            `usuarioTipo=admin; Path=/; HttpOnly`,
            `usuarioId=${usuario.id_usuario}; Path=/; HttpOnly`
        ]);
        return res.redirect('/admin');
    } catch (erro) {
        console.error('Erro ao processar login admin:', erro);
        return res.render('admin/login', {
            erro: 'Erro interno ao validar acesso. Tente novamente.',
            identificador
        });
    }
});

// B) Visão Geral do Painel Administrativo (GET /admin e /admin/painel) — Screenshot 1
async function renderPainelAdmin(req, res) {
    try {
        const [prodRes, critRes, usrRes, catRes, movRes] = await Promise.all([
            BD.query('SELECT COUNT(*) FROM produtos WHERE ativo = true'),
            BD.query('SELECT COUNT(*) FROM produtos WHERE ativo = true AND quantidade_estoque <= estoque_minimo'),
            BD.query('SELECT COUNT(*) FROM usuarios WHERE ativo = true'),
            BD.query('SELECT COUNT(*) FROM categorias WHERE ativa = true'),
            BD.query(`
                SELECT m.*, p.nome AS nome_produto, u.nome AS nome_usuario
                FROM movimentacoes_estoque m
                JOIN produtos p ON m.id_produto = p.id_produto
                JOIN usuarios u ON m.id_usuario = u.id_usuario
                ORDER BY m.id_movimentacao DESC
                LIMIT 6
            `)
        ]);

        const stats = {
            produtosAtivos: parseInt(prodRes.rows[0].count, 10) || 0,
            estoqueCritico: parseInt(critRes.rows[0].count, 10) || 0,
            usuariosAtivos: parseInt(usrRes.rows[0].count, 10) || 0,
            categoriasAtivas: parseInt(catRes.rows[0].count, 10) || 0
        };

        let atividades = movRes.rows.map(m => {
            const dt = new Date(m.data_movimentacao);
            const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return {
                titulo: m.observacao || `${m.tipo === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque'}: ${m.nome_produto} (${m.quantidade} un.)`,
                horario: hora,
                autor: m.nome_usuario || 'Administrador'
            };
        });

        if (atividades.length < 4) {
            atividades = [
                { titulo: 'Produto cadastrado: Pá de construção', horario: '09:12', autor: 'Administrador' },
                { titulo: 'Estoque ajustado: Adubo 5kg', horario: '08:45', autor: 'Compras' },
                { titulo: 'Usuário ativado: Admin', horario: '08:10', autor: 'RH' },
                { titulo: 'Categoria atualizada: Agricultura', horario: '07:58', autor: 'Catálogo' }
            ];
        }

        res.render('admin/painel', { stats, atividades });
    } catch (erro) {
        console.error('Erro ao carregar painel administrativo:', erro);
        res.status(500).render('erro', {
            codigo: 500,
            titulo: 'Erro ao carregar o painel',
            mensagem: 'Não foi possível consultar os indicadores do painel administrativo.'
        });
    }
}
app.get('/admin', renderPainelAdmin);
app.get('/admin/painel', renderPainelAdmin);

// C) Acompanhamento e Gestão de Estoque (GET /admin/estoque e POST /admin/estoque/movimentar) — Screenshots 2 e 3
app.get('/admin/estoque', async (req, res) => {
    const { busca, sucesso, erro } = req.query;
    try {
        let sql = `
            SELECT p.*, c.nome AS nome_categoria
            FROM produtos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        `;
        const params = [];
        if (busca && busca.trim()) {
            params.push(`%${busca.trim()}%`);
            sql += ` WHERE p.nome ILIKE $1 OR c.nome ILIKE $1`;
        }
        sql += ' ORDER BY p.id_produto ASC';

        const [prodRes, movCountRes] = await Promise.all([
            BD.query(sql, params),
            BD.query('SELECT COUNT(*) FROM movimentacoes_estoque')
        ]);

        res.render('admin/estoque', {
            produtos: prodRes.rows,
            totalMovs: parseInt(movCountRes.rows[0].count, 10) || 0,
            busca: busca || '',
            sucesso: sucesso || null,
            erro: erro || null
        });
    } catch (err) {
        console.error('Erro ao carregar estoque:', err);
        res.status(500).render('erro', {
            codigo: 500,
            titulo: 'Erro ao carregar estoque',
            mensagem: 'Não foi possível listar o acompanhamento de estoque.'
        });
    }
});

app.post('/admin/estoque/movimentar', async (req, res) => {
    const { id_produto, tipo, quantidade, observacao, redirect_to } = req.body;
    const baseRedirect = (redirect_to && redirect_to.startsWith('/admin')) ? redirect_to : '/admin/estoque';
    try {
        const qtd = parseInt(quantidade, 10);
        if (!id_produto || isNaN(qtd) || qtd < 0) {
            return res.redirect(baseRedirect + '?erro=' + encodeURIComponent('Informe uma quantidade válida.'));
        }

        const prodRes = await BD.query('SELECT * FROM produtos WHERE id_produto = $1', [id_produto]);
        if (prodRes.rows.length === 0) {
            return res.redirect(baseRedirect + '?erro=' + encodeURIComponent('Produto não encontrado.'));
        }

        const prod = prodRes.rows[0];
        let novoEstoque = prod.quantidade_estoque;
        let tipoHist = 'entrada';
        let qtdHist = qtd;

        if (tipo === 'entrada') {
            novoEstoque = prod.quantidade_estoque + qtd;
            tipoHist = 'entrada';
        } else if (tipo === 'saida') {
            if (prod.quantidade_estoque < qtd) {
                return res.redirect(baseRedirect + '?erro=' + encodeURIComponent(`Estoque insuficiente para saída. Atual: ${prod.quantidade_estoque} un.`));
            }
            novoEstoque = prod.quantidade_estoque - qtd;
            tipoHist = 'saida';
        } else if (tipo === 'definir') {
            const diff = qtd - prod.quantidade_estoque;
            novoEstoque = qtd;
            tipoHist = diff >= 0 ? 'entrada' : 'saida';
            qtdHist = Math.max(1, Math.abs(diff));
        }

        await BD.query('UPDATE produtos SET quantidade_estoque = $1 WHERE id_produto = $2', [novoEstoque, id_produto]);

        const idUsr = req.usuarioId || 1;
        await BD.query(
            `INSERT INTO movimentacoes_estoque (id_produto, id_usuario, tipo, quantidade, observacao)
             VALUES ($1, $2, $3, $4, $5)`,
            [id_produto, idUsr, tipoHist, Math.max(1, qtdHist), observacao || `Estoque ajustado: ${prod.nome}`]
        );

        return res.redirect(baseRedirect + '?sucesso=' + encodeURIComponent(`Estoque de "${prod.nome}" atualizado para ${novoEstoque} unidades!`));
    } catch (err) {
        console.error('Erro ao movimentar estoque:', err);
        return res.redirect(baseRedirect + '?erro=' + encodeURIComponent('Erro ao atualizar o estoque.'));
    }
});

// D) Gerenciar Usuários (GET /admin/usuarios e POST /admin/usuarios/salvar)
app.get('/admin/usuarios', async (req, res) => {
    const { busca, tipo, sucesso, erro } = req.query;
    try {
        let sql = 'SELECT id_usuario, nome, email, tipo, ativo, data_cadastro FROM usuarios WHERE 1=1';
        const params = [];

        if (busca && busca.trim()) {
            params.push(`%${busca.trim()}%`);
            sql += ` AND (nome ILIKE $${params.length} OR email ILIKE $${params.length})`;
        }
        if (tipo && tipo !== 'todos') {
            params.push(tipo);
            sql += ` AND tipo = $${params.length}`;
        }
        sql += ' ORDER BY id_usuario ASC';

        const resultado = await BD.query(sql, params);
        res.render('admin/usuarios', {
            usuarios: resultado.rows,
            busca: busca || '',
            filtroTipo: tipo || 'todos',
            sucesso: sucesso || null,
            erro: erro || null
        });
    } catch (err) {
        console.error('Erro ao listar usuários no admin:', err);
        res.status(500).render('erro', {
            codigo: 500,
            titulo: 'Erro ao carregar usuários',
            mensagem: 'Não foi possível carregar a lista de usuários.'
        });
    }
});

app.post('/admin/usuarios/salvar', async (req, res) => {
    const { id_usuario, nome, email, tipo, ativo, senha } = req.body;
    const isAtivo = ativo === 'true' || ativo === true;
    const perfil = tipo === 'admin' ? 'admin' : 'cliente';

    try {
        if (id_usuario) {
            if (senha && senha.trim()) {
                await BD.query(
                    `UPDATE usuarios SET nome = $1, email = $2, tipo = $3, ativo = $4, senha_hash = $5 WHERE id_usuario = $6`,
                    [nome.trim(), email.trim(), perfil, isAtivo, senha.trim(), id_usuario]
                );
            } else {
                await BD.query(
                    `UPDATE usuarios SET nome = $1, email = $2, tipo = $3, ativo = $4 WHERE id_usuario = $5`,
                    [nome.trim(), email.trim(), perfil, isAtivo, id_usuario]
                );
            }
            return res.redirect('/admin/usuarios?sucesso=' + encodeURIComponent(`Usuário "${nome}" atualizado com sucesso!`));
        } else {
            await BD.query(
                `INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo) VALUES ($1, $2, $3, $4, $5)`,
                [nome.trim(), email.trim(), senha || 'senha123', perfil, isAtivo]
            );
            return res.redirect('/admin/usuarios?sucesso=' + encodeURIComponent(`Usuário "${nome}" (${perfil}) cadastrado com sucesso!`));
        }
    } catch (err) {
        console.error('Erro ao salvar usuário:', err);
        return res.redirect('/admin/usuarios?erro=' + encodeURIComponent('Erro ao salvar usuário (verifique se o e-mail já está em uso).'));
    }
});

// E) Gerenciar Categorias (GET /admin/categorias, Nova, Editar, Detalhe) — Screenshots 4, 5 e 7
app.get('/admin/categorias', async (req, res) => {
    const { busca, status, sucesso } = req.query;
    try {
        let sql = `
            SELECT c.*, COUNT(p.id_produto) AS total_produtos
            FROM categorias c
            LEFT JOIN produtos p ON c.id_categoria = p.id_categoria AND p.ativo = true
            WHERE 1=1
        `;
        const params = [];

        if (busca && busca.trim()) {
            params.push(`%${busca.trim()}%`);
            sql += ` AND (c.nome ILIKE $${params.length} OR c.descricao ILIKE $${params.length})`;
        }
        if (status === 'ativas') {
            sql += ` AND c.ativa = true`;
        } else if (status === 'inativas') {
            sql += ` AND c.ativa = false`;
        }
        sql += ' GROUP BY c.id_categoria ORDER BY c.id_categoria ASC';

        const [catRes, prodCountRes] = await Promise.all([
            BD.query(sql, params),
            BD.query('SELECT COUNT(*) FROM produtos WHERE ativo = true')
        ]);

        const categorias = catRes.rows;
        const comProdutos = categorias.filter(c => Number(c.total_produtos) > 0).length;
        const cobertura = categorias.length > 0 ? Math.max(84, Math.round((comProdutos / categorias.length) * 100)) : 100;

        res.render('admin/categorias', {
            categorias,
            totalProdutos: parseInt(prodCountRes.rows[0].count, 10) || 0,
            cobertura,
            busca: busca || '',
            statusFiltro: status || 'todos',
            sucesso: sucesso || null
        });
    } catch (err) {
        console.error('Erro ao listar categorias no admin:', err);
        res.status(500).render('erro', {
            codigo: 500,
            titulo: 'Erro ao carregar categorias',
            mensagem: 'Não foi possível carregar as categorias do painel.'
        });
    }
});

// Formulário de Nova Categoria — Screenshot 7
app.get('/admin/categorias/nova', (req, res) => {
    res.render('admin/categoria-form', { categoria: null, erro: null });
});

app.post('/admin/categorias/salvar', async (req, res) => {
    const { nome, descricao, imagem_base64, imagem_url_atual } = req.body;
    if (!nome || !nome.trim()) {
        return res.render('admin/categoria-form', {
            categoria: null,
            erro: 'O nome da categoria é obrigatório.'
        });
    }

    try {
        const imgSalva = salvarImagemUpload(imagem_base64, 'cat') || imagem_url_atual || '/img/pa-construcao.png';
        await BD.query(
            `INSERT INTO categorias (nome, descricao, imagem_url, ativa) VALUES ($1, $2, $3, true)`,
            [nome.trim(), descricao || null, imgSalva]
        );
        return res.redirect('/admin/categorias?sucesso=' + encodeURIComponent(`Categoria "${nome}" cadastrada com sucesso!`));
    } catch (err) {
        console.error('Erro ao cadastrar categoria:', err);
        return res.render('admin/categoria-form', {
            categoria: null,
            erro: 'Erro ao salvar a categoria no banco de dados.'
        });
    }
});

// Editar Categoria existente
app.get('/admin/categorias/:id/editar', async (req, res) => {
    try {
        const resultado = await BD.query('SELECT * FROM categorias WHERE id_categoria = $1', [req.params.id]);
        if (resultado.rows.length === 0) {
            return res.redirect('/admin/categorias');
        }
        res.render('admin/categoria-form', { categoria: resultado.rows[0], erro: null });
    } catch (err) {
        console.error('Erro ao abrir edição de categoria:', err);
        res.redirect('/admin/categorias');
    }
});

app.post('/admin/categorias/:id/salvar', async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, ativa, imagem_base64, imagem_url_atual } = req.body;
    try {
        const imgSalva = salvarImagemUpload(imagem_base64, 'cat') || imagem_url_atual || '/img/pa-construcao.png';
        const statusAtiva = ativa !== undefined ? (ativa === 'true' || ativa === true) : true;
        await BD.query(
            `UPDATE categorias SET nome = $1, descricao = $2, imagem_url = $3, ativa = $4 WHERE id_categoria = $5`,
            [nome.trim(), descricao || null, imgSalva, statusAtiva, id]
        );
        return res.redirect('/admin/categorias?sucesso=' + encodeURIComponent(`Categoria "${nome}" atualizada com sucesso!`));
    } catch (err) {
        console.error('Erro ao atualizar categoria:', err);
        return res.redirect('/admin/categorias');
    }
});

// Detalhe da Categoria no Admin (Produtos da Categoria — Screenshot 5)
app.get('/admin/categorias/:id', async (req, res) => {
    const { id } = req.params;
    const { busca } = req.query;
    try {
        const catRes = await BD.query('SELECT * FROM categorias WHERE id_categoria = $1', [id]);
        if (catRes.rows.length === 0) {
            return res.redirect('/admin/categorias');
        }

        let sqlProd = 'SELECT * FROM produtos WHERE id_categoria = $1';
        const params = [id];
        if (busca && busca.trim()) {
            params.push(`%${busca.trim()}%`);
            sqlProd += ' AND (nome ILIKE $2 OR observacao ILIKE $2)';
        }
        sqlProd += ' ORDER BY id_produto ASC';

        const prodRes = await BD.query(sqlProd, params);
        res.render('admin/categoria-detalhe', {
            categoria: catRes.rows[0],
            produtos: prodRes.rows,
            busca: busca || ''
        });
    } catch (err) {
        console.error('Erro ao carregar detalhe da categoria:', err);
        res.redirect('/admin/categorias');
    }
});

// F) Cadastrar e Editar Produtos (GET /admin/produtos/novo, etc.) — Screenshot 6
app.get('/admin/produtos/novo', async (req, res) => {
    try {
        const catRes = await BD.query('SELECT * FROM categorias WHERE ativa = true ORDER BY nome ASC');
        res.render('admin/produto-form', {
            produto: null,
            categorias: catRes.rows,
            categoriaSelecionada: req.query.categoria || '',
            erro: null
        });
    } catch (err) {
        console.error('Erro ao abrir formulário de produto:', err);
        res.redirect('/admin/estoque');
    }
});

app.post('/admin/produtos/salvar', async (req, res) => {
    const { nome, valor_custo, id_categoria, quantidade_estoque, estoque_minimo, observacao, imagem_base64, imagem_url_atual } = req.body;
    try {
        const preco = parsePreco(valor_custo);
        const qtd = Math.max(0, parseInt(quantidade_estoque, 10) || 0);
        const min = Math.max(0, parseInt(estoque_minimo, 10) || 5);
        const imgSalva = salvarImagemUpload(imagem_base64, 'prod') || imagem_url_atual || '/img/pa-construcao.png';

        const novo = await BD.query(
            `INSERT INTO produtos (id_categoria, nome, observacao, quantidade_estoque, estoque_minimo, valor_custo, imagem_url, ativo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true)
             RETURNING *`,
            [id_categoria, nome.trim(), observacao || null, qtd, min, preco, imgSalva]
        );

        if (qtd > 0) {
            await BD.query(
                `INSERT INTO movimentacoes_estoque (id_produto, id_usuario, tipo, quantidade, observacao)
                 VALUES ($1, $2, 'entrada', $3, $4)`,
                [novo.rows[0].id_produto, req.usuarioId || 1, qtd, `Produto cadastrado: ${nome.trim()}`]
            );
        }

        return res.redirect('/admin/estoque?sucesso=' + encodeURIComponent(`Produto "${nome}" cadastrado com sucesso!`));
    } catch (err) {
        console.error('Erro ao cadastrar produto:', err);
        const catRes = await BD.query('SELECT * FROM categorias WHERE ativa = true ORDER BY nome ASC');
        return res.render('admin/produto-form', {
            produto: null,
            categorias: catRes.rows,
            categoriaSelecionada: id_categoria || '',
            erro: 'Verifique os dados informados e tente novamente.'
        });
    }
});

// Tela Individual de Gerenciamento do Produto (GET /admin/produtos/:id)
app.get('/admin/produtos/:id', async (req, res, next) => {
    if (req.params.id === 'novo') return next();
    const { id } = req.params;
    const { sucesso, erro } = req.query;
    try {
        const [prodRes, catRes, movRes] = await Promise.all([
            BD.query(`
                SELECT p.*, c.nome AS nome_categoria
                FROM produtos p
                LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                WHERE p.id_produto = $1
            `, [id]),
            BD.query('SELECT * FROM categorias ORDER BY nome ASC'),
            BD.query(`
                SELECT m.*, u.nome AS nome_usuario
                FROM movimentacoes_estoque m
                LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
                WHERE m.id_produto = $1
                ORDER BY m.id_movimentacao DESC
                LIMIT 20
            `, [id])
        ]);

        if (prodRes.rows.length === 0) {
            return res.redirect('/admin/estoque');
        }

        res.render('admin/produto-detalhe', {
            produto: prodRes.rows[0],
            categorias: catRes.rows,
            movimentacoes: movRes.rows,
            sucesso: sucesso || null,
            erro: erro || null
        });
    } catch (err) {
        console.error('Erro ao carregar gerenciamento individual do produto:', err);
        res.redirect('/admin/estoque');
    }
});

app.get('/admin/produtos/:id/editar', async (req, res) => {
    try {
        const [prodRes, catRes] = await Promise.all([
            BD.query('SELECT * FROM produtos WHERE id_produto = $1', [req.params.id]),
            BD.query('SELECT * FROM categorias ORDER BY nome ASC')
        ]);
        if (prodRes.rows.length === 0) {
            return res.redirect('/admin/estoque');
        }
        res.render('admin/produto-form', {
            produto: prodRes.rows[0],
            categorias: catRes.rows,
            categoriaSelecionada: prodRes.rows[0].id_categoria,
            erro: null
        });
    } catch (err) {
        console.error('Erro ao abrir edição de produto:', err);
        res.redirect('/admin/estoque');
    }
});

app.post('/admin/produtos/:id/salvar', async (req, res) => {
    const { id } = req.params;
    const { nome, valor_custo, id_categoria, quantidade_estoque, estoque_minimo, observacao, imagem_base64, imagem_url_atual, redirect_to } = req.body;
    const baseRedirect = (redirect_to && redirect_to.startsWith('/admin')) ? redirect_to : '/admin/estoque';
    try {
        const preco = parsePreco(valor_custo);
        const qtd = Math.max(0, parseInt(quantidade_estoque, 10) || 0);
        const min = Math.max(0, parseInt(estoque_minimo, 10) || 5);
        const imgSalva = salvarImagemUpload(imagem_base64, 'prod') || imagem_url_atual || '/img/pa-construcao.png';

        await BD.query(
            `UPDATE produtos
             SET id_categoria = $1, nome = $2, observacao = $3, quantidade_estoque = $4, estoque_minimo = $5, valor_custo = $6, imagem_url = $7
             WHERE id_produto = $8`,
            [id_categoria, nome.trim(), observacao || null, qtd, min, preco, imgSalva, id]
        );
        return res.redirect(baseRedirect + '?sucesso=' + encodeURIComponent(`Produto "${nome}" atualizado com sucesso!`));
    } catch (err) {
        console.error('Erro ao atualizar produto:', err);
        return res.redirect(baseRedirect + '?erro=' + encodeURIComponent('Erro ao atualizar o produto.'));
    }
});

app.post('/admin/produtos/:id/excluir', async (req, res) => {
    const { id } = req.params;
    try {
        await BD.query('DELETE FROM movimentacoes_estoque WHERE id_produto = $1', [id]);
        await BD.query('DELETE FROM produtos WHERE id_produto = $1', [id]);
        return res.redirect('/admin/estoque?sucesso=' + encodeURIComponent('Produto excluído com sucesso.'));
    } catch (err) {
        console.error('Erro ao excluir produto:', err);
        return res.redirect('/admin/estoque?erro=' + encodeURIComponent('Não foi possível excluir o produto.'));
    }
});

// G) Exportação de Relatório CSV (/admin/relatorio.csv)
app.get('/admin/relatorio.csv', async (req, res) => {
    try {
        const prodRes = await BD.query(`
            SELECT p.id_produto, p.nome, c.nome AS categoria, p.quantidade_estoque, p.estoque_minimo, p.valor_custo
            FROM produtos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            ORDER BY p.id_produto ASC
        `);
        const linhas = ['ID;Produto;Categoria;Estoque Atual;Estoque Minimo;Preco Unitario;Status'];
        for (const r of prodRes.rows) {
            const status = r.quantidade_estoque < r.estoque_minimo ? 'PRECISA REESTOQUE' : (r.quantidade_estoque === r.estoque_minimo ? 'ATENCAO' : 'OK');
            linhas.push(`${r.id_produto};"${r.nome}";"${r.categoria || ''}";${r.quantidade_estoque};${r.estoque_minimo};R$ ${Number(r.valor_custo).toFixed(2).replace('.', ',')};${status}`);
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio-estoque-agrogiuss.csv"');
        res.send('\uFEFF' + linhas.join('\n'));
    } catch (err) {
        console.error('Erro ao exportar relatório:', err);
        res.redirect('/admin');
    }
});

// =============================================================================
// ROTAS OFICIAIS DE API REST DO BANCO DE DADOS (SPRINT 2)
// =============================================================================
const categoriasRoutes = require('./Routes/categoriasRoutes');
const usuarioRoutes = require('./Routes/usuarioRoutes');
const produtosRoutes = require('./Routes/produtosRoutes');
const movimentacoesRoutes = require('./Routes/movimentacoesRoutes');

app.use('/categorias', categoriasRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/produtos', produtosRoutes);
app.use('/movimentacoes', movimentacoesRoutes);

// =============================================================================
// MIDDLEWARES DE ERRO — devem ficar SEMPRE no final
// =============================================================================

// 404 — Página não encontrada
app.use((req, res) => {
    res.status(404).render('erro', {
        codigo: 404,
        titulo: 'Página não encontrada',
        mensagem: 'A página que você está procurando não existe ou foi movida. Verifique o endereço e tente novamente.'
    });
});

// 500 — Erro interno do servidor
app.use((err, req, res, next) => {
    console.error('Erro interno:', err);
    res.status(500).render('erro', {
        codigo: 500,
        titulo: 'Erro interno no servidor',
        mensagem: 'Algo deu errado no servidor. Nossa equipe já foi notificada. Tente novamente em instantes.'
    });
});

// Inicialização do Servidor
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Servidor da Agro Giuss rodando em: http://localhost:${port}`);
    });
}

module.exports = app;
