-- Script SQL Oficial do Projeto Agro Giuss
-- Banco de Dados: agro_giuss (PostgreSQL)

-- 1. Criação da tabela 'categorias'
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativa BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criação da tabela 'usuarios'
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Criação da tabela 'produtos'
CREATE TABLE IF NOT EXISTS produtos (
    id_produto SERIAL PRIMARY KEY,
    id_categoria INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    observacao TEXT,
    quantidade_estoque INT NOT NULL CHECK (quantidade_estoque >= 0),
    estoque_minimo INT NOT NULL CHECK (estoque_minimo >= 0),
    valor_custo NUMERIC(10,2) NOT NULL CHECK (valor_custo >= 0),
    imagem_url VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categorias (id_categoria)
);

-- 4. Criação da tabela 'movimentacoes_estoque'
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id_movimentacao SERIAL PRIMARY KEY,
    id_produto INT NOT NULL,
    id_usuario INT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    observacao TEXT,
    data_movimentacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_produto
        FOREIGN KEY (id_produto)
        REFERENCES produtos (id_produto),
    CONSTRAINT fk_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario),
    CONSTRAINT ck_tipo_movimentacao
        CHECK (tipo IN ('entrada', 'saida'))
);

-- =============================================================================
-- INSERTS OFICIAIS DO FIGMA (Sprint 2 - Agro Giuss)
-- =============================================================================

-- Categorias do Catálogo Figma:
INSERT INTO categorias (id_categoria, nome, descricao, ativa) VALUES
(1, 'Utensílios', 'Ferramentas manuais e utensílios práticos para trabalho no campo e manutenção geral.', true),
(2, 'Agricultura', 'Insumos, sementes, defensivos e soluções para plantio de alto rendimento.', true),
(3, 'Animais', 'Nutrição, rações, medicamentos e acessórios para animais e rebanho.', true),
(4, 'Rações', 'Linha completa de rações balanceadas para cães, gatos, aves e bovinos.', true),
(5, 'Pesca', 'Equipamentos, molinetes, varas, iscas e artigos para pesca esportiva e lazer.', true),
(6, 'Agropecuária', 'Soluções completas para gestão agropecuária, cerca, manejo e instalações.', true),
(7, 'Plantação', 'Adubos, fertilizantes solúveis, substratos e defensivos para culturas.', true),
(8, 'Casa', 'Tintas, impermeabilizantes, acabamento e utilidades para o lar e fazenda.', true),
(9, 'Jardim', 'Mangueiras, pulverizadores, cortadores e adubos de jardinagem.', true),
(10, 'Acessórios', 'Botinas, luvas, EPIs, correias e peças de reposição rápida.', true)
ON CONFLICT (id_categoria) DO NOTHING;

-- Usuários padrão:
INSERT INTO usuarios (id_usuario, nome, email, senha_hash, ativo) VALUES
(1, 'Administrador Giuss', 'admin@agrogiuss.com.br', 'admin123', true),
(2, 'Operador Estoque', 'estoque@agrogiuss.com.br', 'senha123', true),
(3, 'Produtor Rural Exemplo', 'cliente@agrogiuss.com.br', 'cliente123', true)
ON CONFLICT (id_usuario) DO NOTHING;

-- 6 Produtos oficiais do Catálogo Figma:
INSERT INTO produtos (id_produto, id_categoria, nome, observacao, quantidade_estoque, estoque_minimo, valor_custo, imagem_url, ativo) VALUES
(1, 1, 'Pá de construção', 'Utensílio robusto para construção, manutenção e uso diário no campo.', 25, 5, 55.00, '/img/pa-construcao.png', true),
(2, 4, 'Ração para cachorro Special Dog 10kg', 'Opção equilibrada para cães, com fórmula completa e prática para o dia a dia.', 40, 10, 79.00, '/img/special-dog.png', true),
(3, 3, 'Ração para cachorros, cães adultos quidog 15kg', 'Fórmula completa para cães adultos, com perfil nutricional equilibrado e prático.', 30, 8, 95.00, '/img/quidog.png', true),
(4, 2, 'Adubo 5kg crescimento', 'Solução para nutrição e desenvolvimento de culturas, com embalagem prática para uso no campo.', 50, 12, 40.00, '/img/adubo-npk.png', true),
(5, 5, 'Molinete de pesca', 'Equipamento para pesca e lazer, com acabamento resistente e fácil manuseio.', 18, 4, 159.90, '/img/molinete-pesca.png', true),
(6, 8, 'Tinta lukscolor', 'Solução para acabamento e proteção de superfícies, com acabamento durável e fácil aplicação.', 22, 6, 179.90, '/img/tinta-lukscolor.png', true)
ON CONFLICT (id_produto) DO NOTHING;
