# 🌾 Agro Giuss — Sistema Integrado de Catálogo e Gestão de Estoque (Sprint 2)

> **A Força do Campo e a Praticidade para o seu Dia a Dia em um Só Lugar.**  
> Projeto desenvolvido no **SENAI** — Aplicação Web Full-Stack com **Node.js**, **Express**, **EJS** e **PostgreSQL**.

---

## 📌 Sobre o Projeto

O **Agro Giuss** é uma plataforma web completa voltada para o comércio agropecuário, ferramentas, insumos agrícolas, rações, jardinagem e materiais para o campo e para o lar. O sistema integra duas frentes conectadas em tempo real ao banco de dados **PostgreSQL**:

1. **Loja e Catálogo Público (Área do Cliente)**:
   - **Landing Page Institucional** com vitrine de produtos em destaque, navegação por departamentos, indicadores e depoimentos.
   - **Catálogo Inteligente (`/catalogo`)** com filtro dinâmico por categorias, pesquisa por termos e ordenação por nome ou preço.
   - **Detalhe do Produto (`/produto/:id`)** com galeria, disponibilidade em estoque, especificações técnicas e produtos similares.
   - **Carrinho e Meus Pedidos (`/pedidos`)** com adição rápida de itens e confirmação de pedido integrada à baixa automática de estoque.
   - **Autenticação de Clientes (`/login` e `/cadastro`)**.

2. **Painel Administrativo Completo (`/admin`)**:
   - **`01` Visão Geral (`/admin`)**: Dashboard com KPIs em tempo real (Produtos ativos, Estoque crítico, Usuários ativos, Categorias), atalhos operacionais e feed de atividades recentes.
   - **`02` Gerenciar Estoque (`/admin/estoque`)**: Tabela modernizada de acompanhamento de estoque com barras de nível, status inteligentes (*Em dia*, *Atenção*, *Precisa reestoque*) e modal de ajuste rápido (Entrada, Saída ou Estoque Exato).
   - **Gerenciamento Individual de Produto (`/admin/produtos/:id`)**: Ficha completa do SKU com KPIs financeiros do item, botões de reposição rápida (`+5`, `+10`, `+25`, `-1`, `-5`), edição rápida e histórico individual de movimentações.
   - **`03` Gerenciar Usuários (`/admin/usuarios`)**: Controle de contas de Administradores e Clientes, permissões e status Ativo/Inativo.
   - **`04` Gerenciar Categorias (`/admin/categorias` e `/admin/categorias/:id`)**: Gestão visual em Grade ou Lista com métricas de cobertura e visualização dos produtos vinculados a cada categoria.
   - **`05` Cadastrar Produtos e Categorias (`/admin/produtos/novo` e `/admin/categorias/nova`)**: Formulários com upload de imagem (*Drag & Drop* com pré-visualização) e validador de campos em tempo real.
   - **Exportação de Relatório (`/admin/relatorio.csv`)**: Download instantâneo de planilha CSV com o inventário atualizado.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia |
| :--- | :--- |
| **Back-end** | Node.js + Express.js |
| **Front-end / Templates** | EJS (Embedded JavaScript) + CSS3 Moderno Responsivo + JavaScript (ES6+) |
| **Banco de Dados** | PostgreSQL (`pg` Pool) |
| **Configuração & Ambiente** | `dotenv` + `nodemon` |

---

## 🚀 Como Rodar o Projeto Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/GeteckSENAI/agrogiuss-sprint2.git
cd agrogiuss-sprint2
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar o Banco de Dados PostgreSQL
1. Abra o **pgAdmin** e crie um banco de dados chamado **`agrogiuss`**.
2. Copie o arquivo `.env.example` para `.env` e ajuste a senha do seu PostgreSQL:
   ```env
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=agrogiuss
   DB_PASSWORD=sua_senha_aqui
   DB_PORT=5432
   ```
3. Execute o comando abaixo para criar todas as tabelas e popular os dados iniciais automaticamente (ou rode o arquivo `Dados/banco.sql` no Query Tool do pgAdmin):
   ```bash
   npm run test-db
   ```

### 4. Iniciar o servidor
```bash
npm start
```
Acesse no navegador: **`http://localhost:3000`**

---

## 🔑 Credenciais de Acesso para Testes

| Perfil | E-mail / Usuário | Senha | Rota de Acesso |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@agrogiuss.com` (ou `Admin`) | `admin123` | `http://localhost:3000/admin/login` |
| **Cliente** | `cliente@agrogiuss.com` (ou `Cliente`) | `senha123` | `http://localhost:3000/login` |

---

## 📂 Estrutura de Pastas

```text
Sprint2/
├── Dados/
│   ├── banco.sql                # Script SQL completo (Tabelas + Inserts oficiais)
│   └── migracao_usuarios.sql    # Script complementar de contas Admin e Cliente
├── Routes/                      # Rotas da API REST (Categorias, Produtos, Usuários, Movimentações)
├── public/
│   ├── css/                     # Folhas de estilo (Landing Page, Sistema e Painel Admin)
│   ├── js/                      # Script global da loja (Carrinho, Toast e Menu Rápido)
│   └── img/                     # Imagens de produtos, mascote e uploads
├── views/
│   ├── admin/                   # Telas do Painel Administrativo (Visão Geral, Estoque, Categorias, etc.)
│   ├── landing/                 # Landing Page Institucional
│   ├── catalogo.ejs             # Catálogo público com filtros e busca
│   ├── produto.ejs              # Detalhes do produto + produtos similares
│   ├── pedidos.ejs              # Carrinho de compras e histórico de pedidos
│   ├── login.ejs & cadastro.ejs # Autenticação de clientes
│   └── erro.ejs                 # Tela amigável de erro 404 / 500
├── app.js                       # Servidor principal Express
├── db.js                        # Conexão com o PostgreSQL
└── testeconexao.js              # Teste de conexão e seed automático do banco
```
