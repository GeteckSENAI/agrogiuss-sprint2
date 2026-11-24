-- Script SQL Oficial do Projeto Agro Giuss
-- Banco de Dados: agrogiuss (PostgreSQL)

-- 1. Criação da tabela 'categorias'
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    imagem_url VARCHAR(255),
    ativa BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criação da tabela 'usuarios'
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (tipo IN ('admin', 'cliente')),
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

-- Migrações seguras caso as tabelas já existam
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'cliente';
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS imagem_url VARCHAR(255);

-- =============================================================================
-- INSERTS OFICIAIS DO FIGMA (Sprint 2 - Agro Giuss)
-- =============================================================================

-- Categorias do Catálogo Figma:
INSERT INTO categorias (id_categoria, nome, descricao, imagem_url, ativa) VALUES
(1, 'Utensílios', 'Ferramentas manuais e utensílios práticos para trabalho no campo e manutenção geral.', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80', true),
(2, 'Agricultura', 'Insumos, sementes, defensivos e soluções para plantio de alto rendimento.', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80', true),
(3, 'Animais', 'Cuidados, alimentação e veterinária para grandes e pequenos animais.', 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=800&q=80', true),
(4, 'Rações', 'Alimento balanceado para cães, gatos, cavalos, aves e peixes.', 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=800&q=80', true),
(5, 'Pesca', 'Equipamentos, molinetes, varas, iscas e artigos para pesca esportiva e lazer.', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', true),
(6, 'Agropecuária', 'Soluções completas para gestão agropecuária, cerca, manejo e instalações.', 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=800&q=80', true),
(7, 'Plantação', 'Adubos, fertilizantes solúveis, substratos e defensivos para culturas.', 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80', true),
(8, 'Casa', 'Tintas, impermeabilizantes, acabamento e utilidades para o lar e fazenda.', 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=80', true),
(9, 'Jardim', 'Cuidado das plantas, fertilizantes, sementes, mangueiras e pulverizadores.', 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80', true),
(10, 'Acessórios', 'Botinas, luvas, EPIs, correias e peças de reposição rápida.', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id_categoria) DO UPDATE SET
    imagem_url = EXCLUDED.imagem_url;

-- Usuários padrão (Admin e Cliente):
INSERT INTO usuarios (id_usuario, nome, email, senha_hash, tipo, ativo) VALUES
(1, 'Administrador Giuss', 'admin@agrogiuss.com.br', 'admin123', 'admin', true),
(2, 'Operador Estoque', 'estoque@agrogiuss.com.br', 'senha123', 'admin', true),
(3, 'Produtor Rural Exemplo', 'cliente@agrogiuss.com.br', 'cliente123', 'cliente', true)
ON CONFLICT (id_usuario) DO NOTHING;

INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo) VALUES
('Admin', 'admin@agrogiuss.com', 'admin123', 'admin', true),
('Cliente', 'cliente@agrogiuss.com', 'senha123', 'cliente', true)
ON CONFLICT (email) DO UPDATE SET
    senha_hash = EXCLUDED.senha_hash,
    tipo = EXCLUDED.tipo,
    ativo = true;

-- 6 Produtos oficiais do Catálogo Figma:
INSERT INTO produtos (id_produto, id_categoria, nome, observacao, quantidade_estoque, estoque_minimo, valor_custo, imagem_url, ativo) VALUES
(1, 1, 'Pá de construção', 'Utensílio robusto para construção, manutenção e uso diário no campo.', 25, 5, 55.00, '/img/pa-construcao.png', true),
(2, 4, 'Ração para cachorro Special Dog 10kg', 'Opção equilibrada para cães, com fórmula completa e prática para o dia a dia.', 63, 10, 79.00, '/img/special-dog.png', true),
(3, 3, 'Ração para cachorros, cães adultos quidog 15kg', 'Fórmula completa para cães adultos, com perfil nutricional equilibrado e prático.', 102, 8, 95.00, '/img/quidog.png', true),
(4, 2, 'Adubo 5kg crescimento', 'Solução para nutrição e desenvolvimento de culturas, com embalagem prática para uso no campo.', 12, 12, 40.00, '/img/adubo-npk.png', true),
(5, 5, 'Molinete de pesca', 'Equipamento para pesca e lazer, com acabamento resistente e fácil manuseio.', 5, 10, 159.90, '/img/molinete-pesca.png', true),
(6, 8, 'Tinta lukscolor', 'Solução para acabamento e proteção de superfícies, com acabamento durável e fácil aplicação.', 60, 6, 179.90, '/img/tinta-lukscolor.png', true)
ON CONFLICT (id_produto) DO NOTHING;
