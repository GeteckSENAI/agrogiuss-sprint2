-- =============================================================================
-- MIGRAÇÃO: Adiciona coluna 'tipo' e cria contas de admin e cliente
-- Projeto Agro Giuss - Sprint 2
-- Execute no pgAdmin ou psql no banco 'agrogiuss'
-- =============================================================================

-- 1. Adiciona coluna 'tipo' na tabela usuarios (se ainda não existir)
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'cliente'
    CHECK (tipo IN ('admin', 'cliente'));

-- 2. Conta ADMINISTRADOR
INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo)
VALUES (
    'Admin',
    'admin@agrogiuss.com',
    'admin123',
    'admin',
    true
)
ON CONFLICT (email) DO UPDATE
    SET senha_hash = 'admin123',
        tipo = 'admin',
        ativo = true;

-- 3. Conta CLIENTE
INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo)
VALUES (
    'Cliente',
    'cliente@agrogiuss.com',
    'senha123',
    'cliente',
    true
)
ON CONFLICT (email) DO UPDATE
    SET senha_hash = 'senha123',
        tipo = 'cliente',
        ativo = true;

-- =============================================================================
-- RESULTADO: Credenciais de acesso
--
-- ADMIN:
--   E-mail:  admin@agrogiuss.com    (acessa em /admin/login)
--   Senha:   admin123
--
-- CLIENTE:
--   E-mail:  cliente@agrogiuss.com  (acessa em /login)
--   Senha:   senha123
-- =============================================================================

