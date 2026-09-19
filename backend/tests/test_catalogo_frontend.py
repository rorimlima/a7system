"""
Garante que o catálogo do frontend (fallback offline) não divirja do backend.

`frontend/shared/permissions.js` é usado enquanto a resposta de
`GET /api/auth/permissoes` não chega. Se os dois catálogos saírem de sincronia,
o menu passa a mostrar (ou esconder) módulos que a API trata de outro jeito.
"""
import os
import re

from shared.permissions import MODULOS, PAPEIS

FRONTEND_JS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "frontend", "shared", "permissions.js",
)

MODULO_RE = re.compile(
    r"\{\s*id:\s*'(?P<id>[a-z_]+)',\s*nome:\s*'(?P<nome>[^']*)',[^}]*?"
    r"rota:\s*'(?P<rota>[^']*)',\s*pagina:\s*'(?P<pagina>[^']*)',\s*"
    r"ordem:\s*(?P<ordem>\d+),\s*acoes:\s*\[(?P<acoes>[^\]]*)\]"
)


def _modulos_do_frontend():
    with open(FRONTEND_JS, encoding="utf-8") as arquivo:
        conteudo = arquivo.read()
    modulos = {}
    for m in MODULO_RE.finditer(conteudo):
        acoes = tuple(a.strip().strip("'") for a in m.group("acoes").split(",") if a.strip())
        modulos[m.group("id")] = {
            "nome": m.group("nome"),
            "rota": m.group("rota"),
            "pagina": m.group("pagina"),
            "ordem": int(m.group("ordem")),
            "acoes": acoes,
        }
    return modulos


def test_frontend_declara_os_mesmos_modulos():
    assert set(_modulos_do_frontend()) == set(MODULOS)


def test_frontend_declara_as_mesmas_acoes_rotas_e_ordem():
    frontend = _modulos_do_frontend()
    for modulo, meta in MODULOS.items():
        atual = frontend[modulo]
        assert atual["acoes"] == tuple(meta["acoes"]), f"ações divergentes em {modulo}"
        assert atual["rota"] == meta["rota"], f"rota divergente em {modulo}"
        assert atual["pagina"] == meta["pagina"], f"página divergente em {modulo}"
        assert atual["ordem"] == meta["ordem"], f"ordem divergente em {modulo}"
        assert atual["nome"] == meta["nome"], f"nome divergente em {modulo}"


def test_frontend_declara_os_mesmos_papeis():
    with open(FRONTEND_JS, encoding="utf-8") as arquivo:
        conteudo = arquivo.read()
    bloco = conteudo.split("const PAPEIS_PADRAO")[1].split("];")[0]
    papeis = set(re.findall(r"id:\s*'([a-z_]+)'", bloco))
    assert papeis == set(PAPEIS)
