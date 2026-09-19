"""
Varredura das rotas reais da API: cada endpoint de módulo exige a permissão
declarada no catálogo.

O objetivo aqui não é exercitar a regra de negócio (isso depende do banco), e
sim garantir que nenhuma rota ficou sem guarda ou com a guarda de outro módulo.
"""
import pytest
from fastapi.testclient import TestClient

from main import app
from shared.jwt_auth import create_access_token
from shared.permissions import TODAS_PERMISSOES

EMPRESA = "11111111-1111-1111-1111-111111111111"

# (método, caminho, permissão exigida)
ROTAS = [
    ("GET",  "/api/companies/", "empresas:ver"),
    ("POST", "/api/companies/", "empresas:criar"),
    ("GET",  "/api/auth/users", "usuarios:ver"),
    ("POST", "/api/auth/register", "usuarios:criar"),
    ("GET",  f"/api/fornecedores/?empresaId={EMPRESA}", "fornecedores:ver"),
    ("POST", "/api/fornecedores/", "fornecedores:criar"),
    ("GET",  f"/api/clientes/?empresaId={EMPRESA}", "clientes:ver"),
    ("POST", "/api/clientes/", "clientes:criar"),
    ("GET",  f"/api/products/?empresaId={EMPRESA}", "produtos:ver"),
    ("POST", "/api/products/", "produtos:criar"),
    ("GET",  f"/api/estoque/movimentacoes?empresaId={EMPRESA}", "estoque:ver"),
    ("GET",  f"/api/estoque/alertas?empresaId={EMPRESA}", "estoque:ver"),
    ("POST", "/api/estoque/saida", "saidas:criar"),
    ("POST", "/api/estoque/devolucao", "devolucoes:criar"),
    ("GET",  f"/api/estoque/devolucoes?empresaId={EMPRESA}", "devolucoes:ver"),
    ("GET",  "/api/purchases/", "compras:ver"),
    ("POST", "/api/purchases/", "compras:criar"),
    ("GET",  "/api/parcelas/", "contas_pagar:ver"),
    ("GET",  "/api/parcelas/atrasadas", "contas_pagar:ver"),
    ("POST", "/api/parcelas/conta-1/baixa/1", "contas_pagar:baixar"),
    ("GET",  f"/api/sales/?empresaId={EMPRESA}", "vendas:ver"),
    ("POST", "/api/sales/", "vendas:criar"),
    ("POST", f"/api/sales/venda-1/recebimento?empresaId={EMPRESA}", "recebimentos:criar"),
    ("GET",  f"/api/sales/venda-1/recebimentos?empresaId={EMPRESA}", "recebimentos:ver"),
    ("GET",  "/api/crm/metricas", "crm:ver"),
    ("GET",  f"/api/dashboard/kpis?empresaId={EMPRESA}", "dashboard:ver"),
    ("GET",  f"/api/dashboard/export-pdf?empresaId={EMPRESA}", "dashboard:exportar"),
]


def _client(permissoes):
    token = create_access_token({
        "uid": "22222222-2222-2222-2222-222222222222",
        "sub": "22222222-2222-2222-2222-222222222222",
        "email": "teste@a7system.com",
        "papeis": ["vendedor"],  # papel irrelevante: há permissões explícitas
        "permissoes": list(permissoes),
        "empresasIds": [EMPRESA],
    })
    client = TestClient(app, raise_server_exceptions=False)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


@pytest.mark.parametrize("metodo,caminho,permissao", ROTAS)
def test_rota_exige_a_permissao_do_modulo(metodo, caminho, permissao):
    """Com todas as permissões MENOS a exigida, a rota tem de recusar."""
    outras = [p for p in TODAS_PERMISSOES if p != permissao]
    resposta = _client(outras).request(metodo, caminho, json={})
    assert resposta.status_code == 403, f"{metodo} {caminho} não exigiu {permissao}"
    assert permissao in resposta.json().get("message", "")


@pytest.mark.parametrize("metodo,caminho,permissao", ROTAS)
def test_rota_libera_quem_tem_a_permissao(metodo, caminho, permissao):
    """Com a permissão certa, a autorização passa (o que falhar depois é negócio/banco)."""
    resposta = _client(TODAS_PERMISSOES).request(metodo, caminho, json={})
    assert resposta.status_code != 403, f"{metodo} {caminho} recusou quem tem {permissao}"


def test_rota_sem_token_nao_e_publica():
    client = TestClient(app, raise_server_exceptions=False)
    for metodo, caminho, _ in ROTAS:
        resposta = client.request(metodo, caminho, json={})
        assert resposta.status_code in (401, 403), f"{metodo} {caminho} respondeu {resposta.status_code} sem token"
