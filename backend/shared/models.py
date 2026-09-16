"""
SQLAlchemy models for A7SYSTEM PostgreSQL database.
"""
from datetime import datetime, date
import uuid
from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Date, DateTime, 
    ForeignKey, Text, ARRAY
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from shared.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    razao_social = Column(String(255), nullable=False)
    nome_fantasia = Column(String(255), nullable=True)
    cnpj = Column(String(20), unique=True, nullable=False)
    telefone = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True)
    endereco = Column(JSONB, nullable=True)
    status = Column(String(20), default="ativo")
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)
    atualizado_em = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    usuarios = relationship("Usuario", back_populates="empresa", cascade="all, delete-orphan")
    produtos = relationship("Produto", back_populates="empresa", cascade="all, delete-orphan")
    clientes = relationship("Cliente", back_populates="empresa", cascade="all, delete-orphan")
    fornecedores = relationship("Fornecedor", back_populates="empresa", cascade="all, delete-orphan")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    papeis = Column(ARRAY(String), default=["vendedor"])
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)
    atualizado_em = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    empresa = relationship("Empresa", back_populates="usuarios")


class Fornecedor(Base):
    __tablename__ = "fornecedores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    razao_social = Column(String(255), nullable=False)
    nome_fantasia = Column(String(255), nullable=True)
    cnpj = Column(String(20), nullable=True)
    telefone = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True)
    endereco = Column(JSONB, nullable=True)
    status = Column(String(20), default="ativo")
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)

    empresa = relationship("Empresa", back_populates="fornecedores")


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(255), nullable=False)
    cpf_cnpj = Column(String(20), nullable=True)
    telefone = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True)
    endereco = Column(JSONB, nullable=True)
    status = Column(String(20), default="ativo")
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)

    empresa = relationship("Empresa", back_populates="clientes")


class Produto(Base):
    __tablename__ = "produtos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    codigo_sistema = Column(String(50), nullable=False)
    codigo_fornecedor = Column(String(50), nullable=True)
    descricao = Column(String(255), nullable=False)
    ncm = Column(String(20), nullable=True)
    cfop = Column(String(10), nullable=True)
    cst = Column(String(10), nullable=True)
    quantidade = Column(Integer, default=0)
    quantidade_minima = Column(Integer, default=0)
    valor_unitario = Column(Numeric(12, 2), default=0.00, nullable=False)
    fotos = Column(ARRAY(String), default=[])
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)
    atualizado_em = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    empresa = relationship("Empresa", back_populates="produtos")
    movimentacoes = relationship("MovimentacaoEstoque", back_populates="produto", cascade="all, delete-orphan")


class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    produto_id = Column(UUID(as_uuid=True), ForeignKey("produtos.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    tipo = Column(String(10), nullable=False) # ENTRADA ou SAIDA
    quantidade = Column(Integer, nullable=False)
    motivo = Column(String(255), nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)

    produto = relationship("Produto", back_populates="movimentacoes")


class Compra(Base):
    __tablename__ = "compras"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    fornecedor_id = Column(UUID(as_uuid=True), ForeignKey("fornecedores.id", ondelete="SET NULL"), nullable=True)
    numero_nota = Column(String(50), nullable=True)
    valor_total = Column(Numeric(12, 2), default=0.00, nullable=False)
    status = Column(String(30), default="concluida")
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)

    parcelas = relationship("ParcelaPagar", back_populates="compra", cascade="all, delete-orphan")


class ParcelaPagar(Base):
    __tablename__ = "parcelas_pagar"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    compra_id = Column(UUID(as_uuid=True), ForeignKey("compras.id", ondelete="CASCADE"), nullable=False)
    numero_parcela = Column(Integer, nullable=False)
    total_parcelas = Column(Integer, nullable=False)
    valor = Column(Numeric(12, 2), nullable=False)
    data_vencimento = Column(Date, nullable=False)
    data_pagamento = Column(Date, nullable=True)
    status = Column(String(20), default="pendente") # pendente, pago, atrasado
    forma_pagamento = Column(String(50), nullable=True)

    compra = relationship("Compra", back_populates="parcelas")


class Venda(Base):
    __tablename__ = "vendas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="SET NULL"), nullable=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    valor_total = Column(Numeric(12, 2), default=0.00, nullable=False)
    desconto = Column(Numeric(12, 2), default=0.00)
    valor_final = Column(Numeric(12, 2), default=0.00, nullable=False)
    forma_pagamento = Column(String(50), nullable=True)
    status = Column(String(30), default="concluida")
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)

    itens = relationship("ItemVenda", back_populates="venda", cascade="all, delete-orphan")


class ItemVenda(Base):
    __tablename__ = "itens_venda"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venda_id = Column(UUID(as_uuid=True), ForeignKey("vendas.id", ondelete="CASCADE"), nullable=False)
    produto_id = Column(UUID(as_uuid=True), ForeignKey("produtos.id", ondelete="RESTRICT"), nullable=False)
    quantidade = Column(Integer, nullable=False)
    valor_unitario = Column(Numeric(12, 2), nullable=False)
    valor_total = Column(Numeric(12, 2), nullable=False)

    venda = relationship("Venda", back_populates="itens")
    produto = relationship("Produto")


class CrmLead(Base):
    __tablename__ = "crm_leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(255), nullable=False)
    contato = Column(String(255), nullable=True)
    status = Column(String(30), default="NOVO")
    valor_estimado = Column(Numeric(12, 2), default=0.00)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)


class LogAuditoria(Base):
    __tablename__ = "logs_auditoria"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    acao = Column(String(50), nullable=False)
    entidade = Column(String(50), nullable=False)
    entidade_id = Column(String(100), nullable=True)
    dados_anteriores = Column(JSONB, nullable=True)
    dados_novos = Column(JSONB, nullable=True)
    criado_em = Column(DateTime(timezone=True), default=datetime.utcnow)
