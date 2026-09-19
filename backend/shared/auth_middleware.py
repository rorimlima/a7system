"""
Autenticação e autorização do A7SYSTEM.

A autorização é orientada a módulos: cada rota declara a permissão
``modulo:acao`` que exige (ver ``shared/permissions.py``). Os papéis continuam
existindo, mas apenas como presets que geram o conjunto de permissões do
usuário — nenhuma rota precisa conhecer a lista de papéis.
"""
from typing import Callable, Iterable, List, Optional, Sequence, Union
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from shared.jwt_auth import decode_access_token
from shared.errors import ForbiddenError, A7SystemError
from shared.permissions import (
    MODULOS,
    PAPEL_MASTER,
    modulos_acessiveis,
    resolve_permissions,
)

security = HTTPBearer()


class UserContext(BaseModel):
    """Usuário autenticado, já com as permissões efetivas resolvidas."""
    uid: str
    email: str
    papeis: List[str]
    empresasIds: List[str]
    empresa_ativa: Optional[str] = None
    permissoes: List[str] = []

    # -- Helpers de autorização -------------------------------------------
    @property
    def is_master(self) -> bool:
        return PAPEL_MASTER in self.papeis

    def can(self, *codigos: str) -> bool:
        """True se o usuário possui TODAS as permissões informadas."""
        atuais = set(self.permissoes)
        return all(codigo in atuais for codigo in codigos)

    def can_any(self, *codigos: str) -> bool:
        """True se o usuário possui AO MENOS UMA das permissões informadas."""
        atuais = set(self.permissoes)
        return any(codigo in atuais for codigo in codigos)

    def modulos(self) -> List[str]:
        """Módulos que o usuário pode abrir."""
        return modulos_acessiveis(self.permissoes)

    def has_company(self, empresa_id: Optional[str]) -> bool:
        """True se o usuário pode operar sobre a empresa informada."""
        if self.is_master:
            return True
        if not empresa_id:
            return False
        return str(empresa_id) in self.empresasIds

    def as_dict(self) -> dict:
        """Representação em dicionário (compatível com rotas legadas)."""
        return {
            "uid": self.uid,
            "email": self.email,
            "papeis": self.papeis,
            "empresasIds": self.empresasIds,
            "empresa_ativa": self.empresa_ativa,
            "permissoes": self.permissoes,
        }


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Valida o JWT e devolve o payload decodificado."""
    token = credentials.credentials
    try:
        decoded_token = decode_access_token(token)
        return decoded_token
    except Exception as e:
        raise ForbiddenError(f"Invalid authentication token: {str(e)}")


def get_current_user(
    request: Request,
    decoded_token: dict = Depends(verify_token)
) -> UserContext:
    """Monta o contexto do usuário a partir do token."""
    uid = decoded_token.get("uid") or decoded_token.get("sub", "")
    email = decoded_token.get("email", "")

    # Custom claims
    papeis = decoded_token.get("papeis", [])
    if not isinstance(papeis, list):
        papeis = [papeis]
    empresas_ids = decoded_token.get("empresasIds", [])
    if isinstance(empresas_ids, str):
        empresas_ids = [empresas_ids]

    # Permissões explícitas gravadas no usuário (podem estar ausentes em
    # tokens antigos: nesse caso valem apenas os presets dos papéis).
    permissoes_token = decoded_token.get("permissoes", [])
    if isinstance(permissoes_token, str):
        permissoes_token = [permissoes_token]
    permissoes = sorted(resolve_permissions(papeis, permissoes_token))

    # Anti-IDOR: captura a empresa ativa do header, se informado
    empresa_ativa = request.headers.get("X-Empresa-ID") or request.headers.get("x-empresa-id")
    if empresa_ativa and empresas_ids and empresa_ativa not in empresas_ids:
        if PAPEL_MASTER not in papeis:
            raise ForbiddenError("User does not have access to the requested company.")
    if not empresa_ativa and empresas_ids:
        empresa_ativa = empresas_ids[0]

    return UserContext(
        uid=str(uid),
        email=email,
        papeis=papeis,
        empresasIds=empresas_ids if isinstance(empresas_ids, list) else [empresas_ids],
        empresa_ativa=str(empresa_ativa) if empresa_ativa else None,
        permissoes=permissoes,
    )


# ---------------------------------------------------------------------------
# Dependências de autorização por módulo
# ---------------------------------------------------------------------------

def _flatten(valores: Sequence[Union[str, Iterable[str]]]) -> List[str]:
    """
    Aceita tanto ``f("a", "b")`` quanto ``f(["a", "b"])``.

    As duas formas convivem no projeto; achatar aqui evita o caso silencioso em
    que uma lista era comparada como se fosse um único código e a rota passava
    a negar acesso a todo mundo.
    """
    achatado: List[str] = []
    for valor in valores:
        if isinstance(valor, str):
            achatado.append(valor)
        elif isinstance(valor, Iterable):
            achatado.extend(str(item) for item in valor)
        else:
            achatado.append(str(valor))
    return achatado


def require_permission(*codigos: Union[str, Iterable[str]]) -> Callable:
    """
    Exige que o usuário tenha TODAS as permissões informadas.

    Uso::

        @router.post("/")
        def criar(user: UserContext = Depends(require_permission("vendas:criar"))):
            ...
    """
    requeridas = _flatten(codigos)

    def permission_checker(current_user: UserContext = Depends(get_current_user)) -> UserContext:
        if not current_user.can(*requeridas):
            faltando = [c for c in requeridas if c not in set(current_user.permissoes)]
            raise ForbiddenError(
                "Permissão insuficiente. Requer: " + ", ".join(faltando) + "."
            )
        return current_user

    return permission_checker


def require_any_permission(*codigos: Union[str, Iterable[str]]) -> Callable:
    """Exige AO MENOS UMA das permissões informadas."""
    requeridas = _flatten(codigos)

    def permission_checker(current_user: UserContext = Depends(get_current_user)) -> UserContext:
        if not current_user.can_any(*requeridas):
            raise ForbiddenError(
                "Permissão insuficiente. Requer uma de: " + ", ".join(requeridas) + "."
            )
        return current_user

    return permission_checker


def require_module(modulo: str, acao: str = "ver") -> Callable:
    """Açúcar sintático para ``require_permission(f"{modulo}:{acao}")``."""
    if modulo not in MODULOS:
        raise ValueError(f"Módulo desconhecido: '{modulo}'.")
    return require_permission(f"{modulo}:{acao}")


def require_role(*roles: Union[str, Iterable[str]]) -> Callable:
    """
    Exige que o usuário tenha ao menos um dos papéis informados.

    Mantido para casos em que a regra é realmente sobre o papel (e não sobre um
    módulo). Prefira ``require_permission`` em rotas de módulo.
    """
    requeridos = _flatten(roles)

    def role_checker(current_user: UserContext = Depends(get_current_user)) -> UserContext:
        if not current_user.papeis:
            raise ForbiddenError("User has no roles assigned.")
        if not any(role in current_user.papeis for role in requeridos):
            raise ForbiddenError("User lacks required roles.")
        return current_user

    return role_checker


def require_master() -> Callable:
    """Exige o papel ``master`` (operações globais do sistema)."""
    return require_role(PAPEL_MASTER)


def ensure_company_access(user: UserContext, empresa_id: Optional[str]) -> str:
    """
    Garante que o usuário pode operar na empresa informada e devolve o ID.

    Centraliza a checagem anti-IDOR que antes era repetida em cada rota.
    """
    if not empresa_id:
        empresa_id = user.empresa_ativa
    if not empresa_id:
        raise ForbiddenError("Nenhuma empresa ativa selecionada.")
    if not user.has_company(empresa_id):
        raise ForbiddenError(f"Acesso negado à empresa {empresa_id}.")
    return str(empresa_id)


def require_company(empresa_id: str, current_user: UserContext = Depends(get_current_user)) -> UserContext:
    """Dependência que garante acesso do usuário a uma empresa específica."""
    ensure_company_access(current_user, empresa_id)
    return current_user


# Alias mantido por compatibilidade com importações existentes
require_roles = require_role
