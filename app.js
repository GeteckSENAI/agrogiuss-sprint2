// =============================================================================
// Servidor Principal - Agro Giuss (Sprint 2)
// =============================================================================

const express = require('express');
const app = express();
const port = 3000;

// 1. Configuração do motor de visualização EJS
app.set('view engine', 'ejs');

// 2. Liberação de arquivos estáticos da pasta public
app.use(express.static('public'));

// 3. Processamento de dados no formato JSON e dados enviados por formulário
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com o banco de dados PostgreSQL (agrogiuss)
const BD = require('./db');

// Middleware didático simples para controle de sessão do usuário (via Cookie HTTP)
app.use((req, res, next) => {
    let usuarioNome = null;
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => {
                const [k, ...v] = c.trim().split('=');
                return [k, v.join('=')];
            })
        );
        if (cookies.usuarioNome) {
            usuarioNome = decodeURIComponent(cookies.usuarioNome);
        }
    }
    // Suporte a parâmetro de query (?usuario=...) para testes rápidos
    if (req.query.usuario) {
        usuarioNome = req.query.usuario;
    }
    req.usuarioNome = usuarioNome;
    res.locals.usuarioNome = usuarioNome;
    next();
});

// =============================================================================
// ROTAS DE VISUALIZAÇÃO E NAVEGAÇÃO PÚBLICA (EJS + POSTGRESQL)
// =============================================================================

// 4. Rota Principal - Renderiza a Landing Page Institucional
app.get('/', (req, res) => {
    res.render('landing/index');
});

// A) TELA DE LOGIN (GET e POST)
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
        // Busca na tabela usuarios aceitando login por 'nome' ou 'email'
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

        // Comparação com o campo senha_hash da tabela usuarios
        // (aceita tanto senha_hash igual à senha digitada quanto hashes conhecidos de teste)
        const senhaCorreta = (usuario.senha_hash === senha) ||
            (usuario.senha_hash === 'admin123' && senha === 'admin123') ||
            (usuario.senha_hash === 'senha123hash' && (senha === 'senha123' || senha === 'senha123hash'));

        if (!senhaCorreta) {
            return res.render('login', {
                erro: 'Usuário ou senha inválidos. Tente novamente.',
                identificador
            });
        }

        // Login realizado com sucesso: salva nome do usuário em cookie e redireciona para /catalogo
        res.setHeader('Set-Cookie', `usuarioNome=${encodeURIComponent(usuario.nome)}; Path=/; HttpOnly`);
        return res.redirect('/catalogo');

    } catch (erro) {
        console.error('Erro ao processar login:', erro);
        return res.render('login', {
            erro: 'Erro interno ao validar acesso no banco de dados.',
            identificador
        });
    }
});

// Logout simples para encerrar a sessão
app.get('/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'usuarioNome=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.redirect('/');
});

// B) TELA DE CATÁLOGO (GET /catalogo com filtros e busca no PostgreSQL)
app.get('/catalogo', async (req, res) => {
    const { categoria, busca, ordem } = req.query;

    try {
        // 1. Busca todas as categorias ativas para a barra de pílulas de filtro
        const categoriasRes = await BD.query(`
            SELECT id_categoria, nome, descricao 
            FROM categorias 
            WHERE ativa = true 
            ORDER BY id_categoria ASC
        `);

        // 2. Constrói query dinâmica de produtos ativos com JOIN na tabela categorias
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

        // Filtro por categoria (se informado e diferente de 'todos')
        if (categoria && categoria !== 'todos') {
            params.push(categoria);
            sql += ` AND p.id_categoria = $${params.length}`;
        }

        // Filtro por termo de busca
        if (busca && busca.trim()) {
            params.push(`%${busca.trim()}%`);
            sql += ` AND (p.nome ILIKE $${params.length} OR p.observacao ILIKE $${params.length} OR c.nome ILIKE $${params.length})`;
        }

        // Ordenação
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
            ordem: ordem || 'az',
            usuarioNome: res.locals.usuarioNome
        });

    } catch (erro) {
        console.error('Erro ao carregar catálogo:', erro);
        res.status(500).send('Erro ao carregar o catálogo de produtos.');
    }
});

// C) TELA DE DETALHE DO PRODUTO (GET /produto/:id com dados reais do PostgreSQL)
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
            return res.redirect('/catalogo');
        }

        res.render('produto', {
            produto: resultado.rows[0],
            usuarioNome: res.locals.usuarioNome
        });

    } catch (erro) {
        console.error('Erro ao carregar detalhe do produto:', erro);
        res.status(500).send('Erro ao carregar os detalhes do produto.');
    }
});

// ROTAS OFICIAIS DE API REST DO BANCO DE DADOS (SPRINT 2)
const categoriasRoutes = require('./Routes/categoriasRoutes');
const usuarioRoutes = require('./Routes/usuarioRoutes');
const produtosRoutes = require('./Routes/produtosRoutes');
const movimentacoesRoutes = require('./Routes/movimentacoesRoutes');

app.use('/categorias', categoriasRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/produtos', produtosRoutes);
app.use('/movimentacoes', movimentacoesRoutes);

// Inicialização do Servidor
app.listen(port, () => {
    console.log(`Servidor da Agro Giuss rodando em: http://localhost:${port}`);
});

module.exports = app;
