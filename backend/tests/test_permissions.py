"""
Testes do modelo de permissões por módulo.
"""
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from shared.auth_middleware import (
    UserContext,
    ensure_company_access,
    require_any_permission,
    require_permission,
    require_role,
)
from shared.errors import setup_exception_handlers
from shared.jwt_auth import create_access_token
from shared.permissions import (
    MODULOS,
    PAPEIS,
    TODAS_PERMISSOES,
    catalogo,
    is_permissao_valida,
    modulos_acessiveis,
    resolve_permissions,
    validar_permissoes,
)


# ---------------------------------------------------------------- catálogo

def test_todas_permissoes_seguem_o_formato_modulo_acao():
    for codigo in TODAS_PERMISSOES:
        modulo, _, acao = codigo.partition(":")
        assert modulo in MODULOS
        assert acao in MODULOS[modulo]["acoes"]


def test_presets_de_papel_usam_apenas_permissoes_validas():
    for papel, meta in PAPEIS.items():
        for codigo in meta["permissoes"]:
            assert is_permissao_valida(codigo), f"{papel} concede permissão inexistente: {codigo}"


def test_todo_modulo_tem_a_acao_ver():
    for modulo, meta in MODULOS.items():
        assert "ver" in meta["acoes"], f"módulo {modulo} não define a ação 'ver'"


def test_catalogo_exposto_ao_frontend_cobre_modulos_e_papeis():
    cat = catalogo()
    assert {m["id"] for m in cat["modulos"]} == set(MODULOS)
    assert {p["id"] for p in cat["papeis"]} == set(PAPEIS)
    # a ordem do menu vem pronta do backend
    ordens = [m["ordem"] for m in cat["modulos"]]
    assert ordens == sorted(ordens)


# -------------------------------------------------------------- resolução

def test_master_recebe_todas_as_permissoes():
    assert resolve_permissions(["master"]) == set(TODAS_PERMISSOES)


def test_master_ignora_permissoes_explicitas_restritivas():
    assert resolve_permissions(["master"], ["clientes:ver"]) == set(TODAS_PERMISSOES)


def test_papel_sem_permissoes_explicitas_usa_o_preset():
    assert resolve_permissions(["vendedor"]) == PAPEIS["vendedor"]["permissoes"]


def test_permissoes_explicitas_substituem_o_preset_do_papel():
    efetivas = resolve_permissions(["vendedor"], ["clientes:ver", "crm:ver"])
    assert efetivas == {"clientes:ver", "crm:ver"}
    assert "vendas:criar" not in efetivas


def test_uniao_de_papeis_quando_nao_ha_permissoes_explicitas():
    efetivas = resolve_permissions(["vendedor", "estoque"])
    assert "vendas:criar" in efetivas
    assert "saidas:criar" in efetivas


def test_usuario_sem_papel_e_sem_permissao_nao_acessa_nada():
    assert resolve_permissions([], []) == set()


def test_permissoes_desconhecidas_sao_ignoradas_na_resolucao():
    assert resolve_permissions([], ["modulo_inexistente:ver"]) == set()


def test_validar_permissoes_rejeita_codigo_invalido():
    with pytest.raises(ValueError):
        validar_permissoes(["vendas:ver", "vendas:explodir"])


def test_validar_permissoes_normaliza_e_remove_duplicatas():
    assert validar_permissoes([" Vendas:Ver ", "vendas:ver"]) == ["vendas:ver"]


def test_modulos_acessiveis_considera_apenas_a_acao_ver():
    modulos = modulos_acessiveis({"vendas:criar", "crm:ver"})
    assert modulos == ["crm"]


# ------------------------------------------------------- app de exemplo

def _app_de_teste() -> FastAPI:
    app = FastAPI()
    setup_exception_handlers(app)

    @app.get("/ver")
    def rota_ver(user: UserContext = Depends(require_permission("vendas:ver"))):
        return {"uid": user.uid}

    @app.get("/criar")
    def rota_criar(user: UserContext = Depends(require_permission("vendas:criar"))):
        return {"uid": user.uid}

    @app.get("/lista")
    def rota_lista(user: UserContext = Depends(require_permission(["vendas:ver", "crm:ver"]))):
        return {"uid": user.uid}

    @app.get("/qualquer")
    def rota_qualquer(user: UserContext = Depends(require_any_permission("vendas:ver", "crm:ver"))):
        return {"uid": user.uid}

    @app.get("/papel")
    def rota_papel(user: UserContext = Depends(require_role(["master", "adm"]))):
        return {"uid": user.uid}

    @app.get("/empresa/{empresa_id}")
    def rota_empresa(empresa_id: str, user: UserContext = Depends(require_permission("vendas:ver"))):
        return {"empresa": ensure_company_access(user, empresa_id)}

    return app


def _token(papeis, permissoes=None, empresas=("emp_1",)):
    return create_access_token({
        "uid": "u1",
        "sub": "u1",
        "email": "teste@a7system.com",
        "papeis": list(papeis),
        "permissoes": list(permissoes or []),
        "empresasIds": list(empresas),
    })


def _cliente(papeis, permissoes=None, empresas=("emp_1",)):
    client = TestClient(_app_de_teste(), raise_server_exceptions=False)
    client.headers.update({"Authorization": f"Bearer {_token(papeis, permissoes, empresas)}"})
    return client


def test_rota_autoriza_quem_tem_a_permissao():
    assert _cliente(["vendedor"]).get("/criar").status_code == 200


def test_rota_nega_quem_nao_tem_a_permissao():
    resposta = _cliente(["estoque"]).get("/criar")
    assert resposta.status_code == 403
    assert "vendas:criar" in resposta.json()["message"]


def test_master_passa_em_qualquer_rota():
    client = _cliente(["master"])
    assert client.get("/criar").status_code == 200
    assert client.get("/lista").status_code == 200


def test_permissao_explicita_do_usuario_prevalece_sobre_o_papel():
    # papel vendedor concede vendas:criar, mas o usuário foi restringido
    client = _cliente(["vendedor"], ["vendas:ver"])
    assert client.get("/ver").status_code == 200
    assert client.get("/criar").status_code == 403


def test_lista_de_permissoes_exige_todas():
    assert _cliente(["vendedor"], ["vendas:ver"]).get("/lista").status_code == 403
    assert _cliente(["vendedor"], ["vendas:ver", "crm:ver"]).get("/lista").status_code == 200


def test_require_any_permission_exige_apenas_uma():
    assert _cliente(["vendedor"], ["crm:ver"]).get("/qualquer").status_code == 200
    assert _cliente(["vendedor"], ["produtos:ver"]).get("/qualquer").status_code == 403


def test_require_role_aceita_lista_de_papeis():
    # regressão: a lista era comparada como um único papel e negava todo mundo
    assert _cliente(["adm"]).get("/papel").status_code == 200
    assert _cliente(["vendedor"]).get("/papel").status_code == 403


def test_acesso_a_empresa_de_outro_tenant_e_negado():
    client = _cliente(["vendedor"], empresas=("emp_1",))
    assert client.get("/empresa/emp_1").status_code == 200
    assert client.get("/empresa/emp_2").status_code == 403


def test_master_acessa_qualquer_empresa():
    assert _cliente(["master"], empresas=("emp_1",)).get("/empresa/emp_9").status_code == 200


def test_requisicao_sem_token_e_rejeitada():
    resposta = TestClient(_app_de_teste(), raise_server_exceptions=False).get("/ver")
    assert resposta.status_code in (401, 403)


def test_token_antigo_sem_claim_de_permissoes_cai_no_preset_do_papel():
    token = create_access_token({
        "uid": "u1",
        "sub": "u1",
        "email": "antigo@a7system.com",
        "papeis": ["vendedor"],
        "empresasIds": ["emp_1"],
    })
    client = TestClient(_app_de_teste(), raise_server_exceptions=False)
    client.headers.update({"Authorization": f"Bearer {token}"})
    assert client.get("/criar").status_code == 200
