"""
Script de inicialização do banco de dados PostgreSQL no Supabase.
Cria todas as tabelas, índices e dados iniciais (empresa matriz e usuário admin).
"""
import os
import psycopg2
from urllib.parse import quote_plus
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


database_url = os.getenv("DATABASE_URL")
if not database_url:
    password = quote_plus("reivax@rorim7")
    user = "postgres.vjzuqdjmadjxyvrfzbod"
    host = "aws-0-sa-east-1.pooler.supabase.com"
    port = 5432
    db_name = "postgres"
    database_url = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"

DDL = """
-- Habilita extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Empresas (Multi-tenant)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    telefone VARCHAR(30),
    email VARCHAR(255),
    endereco JSONB,
    status VARCHAR(20) DEFAULT 'ativo',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    papeis TEXT[] DEFAULT ARRAY['vendedor'],
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(20),
    telefone VARCHAR(30),
    email VARCHAR(255),
    endereco JSONB,
    status VARCHAR(20) DEFAULT 'ativo',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(20),
    telefone VARCHAR(30),
    email VARCHAR(255),
    endereco JSONB,
    status VARCHAR(20) DEFAULT 'ativo',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo_sistema VARCHAR(50) NOT NULL,
    codigo_fornecedor VARCHAR(50),
    descricao VARCHAR(255) NOT NULL,
    ncm VARCHAR(20),
    cfop VARCHAR(10),
    cst VARCHAR(10),
    quantidade INT DEFAULT 0,
    quantidade_minima INT DEFAULT 0,
    valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fotos TEXT[] DEFAULT ARRAY[]::TEXT[],
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_empresa_codigo_sistema UNIQUE (empresa_id, codigo_sistema)
);

-- 6. Movimentações de Estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    quantidade INT NOT NULL,
    motivo VARCHAR(255),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Compras e Contas a Pagar
CREATE TABLE IF NOT EXISTS compras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
    numero_nota VARCHAR(50),
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'concluida',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcelas_pagar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    compra_id UUID REFERENCES compras(id) ON DELETE CASCADE,
    numero_parcela INT NOT NULL,
    total_parcelas INT NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente',
    forma_pagamento VARCHAR(50)
);

-- 8. Vendas e Itens da Venda
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(12,2) DEFAULT 0.00,
    valor_final NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    forma_pagamento VARCHAR(50),
    status VARCHAR(30) DEFAULT 'concluida',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade INT NOT NULL,
    valor_unitario NUMERIC(12,2) NOT NULL,
    valor_total NUMERIC(12,2) NOT NULL
);

-- 9. CRM (Leads e Oportunidades)
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    contato VARCHAR(255),
    status VARCHAR(30) DEFAULT 'NOVO',
    valor_estimado NUMERIC(12,2) DEFAULT 0.00,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Auditoria e Logs
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(50) NOT NULL,
    entidade VARCHAR(50) NOT NULL,
    entidade_id VARCHAR(100),
    dados_anteriores JSONB,
    dados_novos JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de Performance por Empresa (Multi-tenancy)
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa ON vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compras_empresa ON compras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa ON fornecedores(empresa_id);
"""

def init_database():
    print(f"Conectando ao PostgreSQL do Supabase...")
    conn = psycopg2.connect(database_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Executando DDL (criando tabelas e índices)...")
    cur.execute(DDL)
    print("Tabelas criadas com sucesso!")

    # Adiciona coluna dados JSONB para campos dinâmicos caso necessário
    tabelas = [
        'empresas', 'usuarios', 'fornecedores', 'clientes', 'produtos', 
        'movimentacoes_estoque', 'compras', 'parcelas_pagar', 'vendas', 
        'itens_venda', 'crm_leads', 'logs_auditoria'
    ]
    for t in tabelas:
        cur.execute(f"ALTER TABLE {t} ADD COLUMN IF NOT EXISTS dados JSONB DEFAULT '{{}}'::jsonb;")
    print("Colunas 'dados JSONB' verificadas!")

    
    # 1. Cria ou recupera Empresa Padrão
    cur.execute("SELECT id FROM empresas LIMIT 1;")
    empresa = cur.fetchone()
    if not empresa:
        print("Criando Empresa Matriz padrão...")
        cur.execute("""
            INSERT INTO empresas (razao_social, nome_fantasia, cnpj, email, status)
            VALUES ('A7SYSTEM MATRIZ LTDA', 'A7SYSTEM', '00.000.000/0001-00', 'admin@a7system.com', 'ativo')
            RETURNING id;
        """)
        empresa_id = cur.fetchone()[0]
        print(f"Empresa criada com sucesso! ID: {empresa_id}")
    else:
        empresa_id = empresa[0]
        print(f"Empresa existente: {empresa_id}")
        
    # 2. Cria ou recupera Usuário Admin Master
    cur.execute("SELECT id FROM usuarios WHERE email = 'admin@a7system.com';")
    user = cur.fetchone()
    if not user:
        print("Criando usuário Administrador (admin@a7system.com)...")
        senha_hash = hash_password("admin123")
        cur.execute("""
            INSERT INTO usuarios (empresa_id, nome, email, senha_hash, papeis, ativo)
            VALUES (%s, 'Administrador Master', 'admin@a7system.com', %s, ARRAY['master', 'adm', 'estoque', 'financeiro', 'vendedor'], TRUE)
            RETURNING id;
        """, (str(empresa_id), senha_hash))
        user_id = cur.fetchone()[0]
        print(f"Usuário criado! ID: {user_id} (Login: admin@a7system.com / Senha: admin123)")
    else:
        print("Usuário admin já existe.")
        
    # 3. Listar tabelas criadas para confirmação
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables = [r[0] for r in cur.fetchall()]
    print("\nTabelas no schema public:", tables)
    
    cur.close()
    conn.close()
    print("\nInicialização do banco concluída com sucesso!")

if __name__ == "__main__":
    init_database()
