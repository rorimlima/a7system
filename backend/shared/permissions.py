"""
Catálogo central de módulos e permissões do A7SYSTEM.

Este módulo é a única fonte de verdade sobre:
  - quais módulos existem no sistema;
  - quais ações cada módulo aceita;
  - quais permissões cada papel (preset) concede;
  - como as permissões efetivas de um usuário são resolvidas.

Um código de permissão tem sempre o formato ``modulo:acao`` (ex.: ``vendas:criar``).
O frontend consome o mesmo catálogo via ``GET /api/auth/permissoes``, de modo que
menu, rotas e telas ficam sempre alinhados com o que o backend autoriza.
"""
from typing import Dict, Iterable, List, Optional, Set

# ---------------------------------------------------------------------------
# Ações genéricas
# ---------------------------------------------------------------------------

ACOES_LABEL: Dict[str, str] = {
    "ver": "Visualizar",
    "criar": "Criar",
    "editar": "Editar",
    "excluir": "Excluir",
    "exportar": "Exportar",
    "baixar": "Dar baixa",
}

CRUD = ("ver", "criar", "editar", "excluir")


# ---------------------------------------------------------------------------
# Catálogo de módulos
# ---------------------------------------------------------------------------
# Cada módulo descreve uma área funcional completa do sistema: a rota da SPA,
# a página que a renderiza, o ícone do menu e as ações suportadas.

MODULOS: Dict[str, dict] = {
    "dashboard": {
        "nome": "Dashboard",
        "descricao": "Indicadores, gráficos e exportação do painel gerencial.",
        "icone": "📊",
        "rota": "/dashboard",
        "pagina": "DashboardPage",
        "ordem": 10,
        "acoes": ("ver", "exportar"),
    },
    "empresas": {
        "nome": "Empresas",
        "descricao": "Cadastro das empresas (multi-empresa).",
        "icone": "🏢",
        "rota": "/empresas",
        "pagina": "EmpresasPage",
        "ordem": 20,
        "acoes": ("ver", "criar", "editar"),
    },
    "usuarios": {
        "nome": "Usuários",
        "descricao": "Gestão de usuários, papéis e permissões por módulo.",
        "icone": "👥",
        "rota": "/usuarios",
        "pagina": "UsuariosPage",
        "ordem": 30,
        "acoes": ("ver", "criar", "editar"),
    },
    "fornecedores": {
        "nome": "Fornecedores",
        "descricao": "Cadastro de fornecedores.",
        "icone": "🚚",
        "rota": "/fornecedores",
        "pagina": "FornecedoresPage",
        "ordem": 40,
        "acoes": CRUD,
    },
    "clientes": {
        "nome": "Clientes",
        "descricao": "Cadastro de clientes.",
        "icone": "🧑‍💼",
        "rota": "/clientes",
        "pagina": "ClientesPage",
        "ordem": 50,
        "acoes": CRUD,
    },
    "produtos": {
        "nome": "Produtos",
        "descricao": "Catálogo de produtos e preços.",
        "icone": "📦",
        "rota": "/produtos",
        "pagina": "ProdutosPage",
        "ordem": 60,
        "acoes": ("ver", "criar", "editar"),
    },
    "estoque": {
        "nome": "Estoque",
        "descricao": "Posição de estoque, movimentações e alertas de mínimo.",
        "icone": "🏭",
        "rota": "/estoque",
        "pagina": "EstoquePage",
        "ordem": 70,
        "acoes": ("ver",),
    },
    "saidas": {
        "nome": "Saídas e Ajustes",
        "descricao": "Baixas manuais de estoque por perda, quebra ou ajuste.",
        "icone": "📉",
        "rota": "/saidas",
        "pagina": "SaidasPage",
        "ordem": 80,
        "acoes": ("ver", "criar"),
    },
    "devolucoes": {
        "nome": "Devoluções",
        "descricao": "Devoluções de mercadoria ao fornecedor.",
        "icone": "🔄",
        "rota": "/devolucoes",
        "pagina": "DevolucoesPage",
        "ordem": 90,
        "acoes": ("ver", "criar"),
    },
    "compras": {
        "nome": "Compras",
        "descricao": "Entrada de notas de compra e geração de parcelas.",
        "icone": "🛒",
        "rota": "/compras",
        "pagina": "ComprasPage",
        "ordem": 100,
        "acoes": ("ver", "criar"),
    },
    "contas_pagar": {
        "nome": "Contas a Pagar",
        "descricao": "Parcelas a pagar, vencimentos e baixas.",
        "icone": "💸",
        "rota": "/contas-pagar",
        "pagina": "ContasPagarPage",
        "ordem": 110,
        "acoes": ("ver", "baixar"),
    },
    "vendas": {
        "nome": "Vendas",
        "descricao": "Fechamento de vendas, recibos e histórico.",
        "icone": "🧾",
        "rota": "/vendas",
        "pagina": "VendasPage",
        "ordem": 120,
        "acoes": ("ver", "criar"),
    },
    "recebimentos": {
        "nome": "Recebimentos",
        "descricao": "Recebimentos das vendas e controle de inadimplência.",
        "icone": "💰",
        "rota": "/recebimentos",
        "pagina": "RecebimentosPage",
        "ordem": 130,
        "acoes": ("ver", "criar"),
    },
    "crm": {
        "nome": "CRM",
        "descricao": "Ranking de clientes, histórico e métricas de relacionamento.",
        "icone": "🤝",
        "rota": "/crm",
        "pagina": "CrmPage",
        "ordem": 140,
        "acoes": ("ver",),
    },
}

#: Módulo aberto a qualquer usuário autenticado (usado como rota inicial segura).
MODULO_PADRAO = "dashboard"


def _build_all_permissions() -> List[str]:
    codigos: List[str] = []
    for modulo, meta in MODULOS.items():
        for acao in meta["acoes"]:
            codigos.append(f"{modulo}:{acao}")
    return codigos


#: Todas as permissões válidas do sistema, em ordem estável.
TODAS_PERMISSOES: List[str] = _build_all_permissions()
_PERMISSOES_VALIDAS: Set[str] = set(TODAS_PERMISSOES)


def permissoes_do_modulo(modulo: str) -> List[str]:
    """Retorna todos os códigos de permissão de um módulo."""
    meta = MODULOS.get(modulo)
    if not meta:
        return []
    return [f"{modulo}:{acao}" for acao in meta["acoes"]]


def _expandir(*modulos: str) -> Set[str]:
    """Todas as permissões dos módulos informados."""
    resultado: Set[str] = set()
    for modulo in modulos:
        resultado.update(permissoes_do_modulo(modulo))
    return resultado


# ---------------------------------------------------------------------------
# Papéis (presets de permissão)
# ---------------------------------------------------------------------------
# Papéis não são mais verificados diretamente nas rotas: eles apenas definem um
# conjunto padrão de permissões. Um usuário pode ter suas permissões ajustadas
# módulo a módulo sem depender do papel.

PAPEL_MASTER = "master"

PAPEIS: Dict[str, dict] = {
    "master": {
        "nome": "Master",
        "descricao": "Acesso irrestrito a todos os módulos, inclusive novos.",
        "cor": "danger",
        "permissoes": set(TODAS_PERMISSOES),
    },
    "adm": {
        "nome": "Administrador",
        "descricao": "Opera todos os módulos; não cria/exclui empresas nem usuários.",
        "cor": "primary",
        "permissoes": (
            _expandir(
                "dashboard",
                "fornecedores",
                "clientes",
                "produtos",
                "estoque",
                "saidas",
                "devolucoes",
                "compras",
                "contas_pagar",
                "vendas",
                "recebimentos",
                "crm",
            )
            | {"empresas:ver", "empresas:editar", "usuarios:ver"}
        ),
    },
    "financeiro": {
        "nome": "Financeiro",
        "descricao": "Contas a pagar, recebimentos e indicadores financeiros.",
        "cor": "info",
        "permissoes": (
            _expandir("contas_pagar", "recebimentos")
            | {
                "dashboard:ver",
                "dashboard:exportar",
                "compras:ver",
                "vendas:ver",
                "clientes:ver",
                "fornecedores:ver",
            }
        ),
    },
    "vendedor": {
        "nome": "Vendedor",
        "descricao": "Vendas, clientes, CRM e consulta de produtos/estoque.",
        "cor": "success",
        "permissoes": {
            "clientes:ver",
            "clientes:criar",
            "clientes:editar",
            "produtos:ver",
            "estoque:ver",
            "compras:ver",
            "vendas:ver",
            "vendas:criar",
            "recebimentos:ver",
            "recebimentos:criar",
            "crm:ver",
        },
    },
    "estoque": {
        "nome": "Estoque",
        "descricao": "Produtos, movimentações, compras, saídas e devoluções.",
        "cor": "warning",
        "permissoes": (
            _expandir("produtos", "estoque", "saidas", "devolucoes")
            | {
                "fornecedores:ver",
                "fornecedores:criar",
                "fornecedores:editar",
                "compras:ver",
                "compras:criar",
                "vendas:ver",
            }
        ),
    },
}


# ---------------------------------------------------------------------------
# Resolução de permissões
# ---------------------------------------------------------------------------

def is_permissao_valida(codigo: str) -> bool:
    """Indica se o código informado existe no catálogo."""
    return codigo in _PERMISSOES_VALIDAS


def validar_permissoes(codigos: Optional[Iterable[str]]) -> List[str]:
    """
    Normaliza e valida uma lista de códigos de permissão.

    Levanta ``ValueError`` no primeiro código desconhecido, para que a API
    devolva um erro claro em vez de gravar permissões que nunca autorizam nada.
    """
    if not codigos:
        return []
    normalizadas: List[str] = []
    for codigo in codigos:
        limpo = str(codigo).strip().lower()
        if not limpo:
            continue
        if not is_permissao_valida(limpo):
            raise ValueError(f"Permissão desconhecida: '{codigo}'.")
        if limpo not in normalizadas:
            normalizadas.append(limpo)
    return normalizadas


def permissoes_dos_papeis(papeis: Optional[Iterable[str]]) -> Set[str]:
    """União das permissões concedidas pelos papéis informados."""
    resultado: Set[str] = set()
    for papel in papeis or []:
        preset = PAPEIS.get(str(papel).strip().lower())
        if preset:
            resultado.update(preset["permissoes"])
    return resultado


def resolve_permissions(
    papeis: Optional[Iterable[str]],
    permissoes: Optional[Iterable[str]] = None,
) -> Set[str]:
    """
    Resolve as permissões efetivas de um usuário.

    Regras (nesta ordem):
      1. ``master`` sempre recebe todas as permissões, inclusive de módulos novos;
      2. se o usuário tem permissões explícitas gravadas, elas são as efetivas
         (é assim que se concede ou retira acesso módulo a módulo);
      3. caso contrário, valem os presets dos papéis — mantendo compatibilidade
         com os usuários criados antes da personalização por módulo.
    """
    lista_papeis = [str(p).strip().lower() for p in (papeis or []) if str(p).strip()]
    if PAPEL_MASTER in lista_papeis:
        return set(TODAS_PERMISSOES)

    explicitas = {
        str(p).strip().lower()
        for p in (permissoes or [])
        if str(p).strip() and is_permissao_valida(str(p).strip().lower())
    }
    if explicitas:
        return explicitas

    return permissoes_dos_papeis(lista_papeis)


def tem_permissao(permissoes_efetivas: Iterable[str], codigo: str) -> bool:
    """Verifica uma permissão dentro de um conjunto já resolvido."""
    return codigo in set(permissoes_efetivas)


def modulos_acessiveis(permissoes_efetivas: Iterable[str]) -> List[str]:
    """
    Módulos que o usuário pode abrir — isto é, aqueles em que ele tem
    ao menos a permissão de visualização.
    """
    efetivas = set(permissoes_efetivas)
    return [
        modulo
        for modulo in sorted(MODULOS, key=lambda m: MODULOS[m]["ordem"])
        if f"{modulo}:ver" in efetivas
    ]


def catalogo() -> dict:
    """
    Catálogo serializável consumido pelo frontend para montar menu, rotas e a
    matriz de permissões da tela de usuários.
    """
    return {
        "acoes": [{"id": acao, "nome": nome} for acao, nome in ACOES_LABEL.items()],
        "modulos": [
            {
                "id": modulo,
                "nome": meta["nome"],
                "descricao": meta["descricao"],
                "icone": meta["icone"],
                "rota": meta["rota"],
                "pagina": meta["pagina"],
                "ordem": meta["ordem"],
                "acoes": list(meta["acoes"]),
                "permissoes": permissoes_do_modulo(modulo),
            }
            for modulo, meta in sorted(MODULOS.items(), key=lambda item: item[1]["ordem"])
        ],
        "papeis": [
            {
                "id": papel,
                "nome": meta["nome"],
                "descricao": meta["descricao"],
                "cor": meta["cor"],
                "permissoes": sorted(meta["permissoes"]),
            }
            for papel, meta in PAPEIS.items()
        ],
    }
