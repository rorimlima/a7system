"""
Camada de compatibilidade do middleware de auth.

As rotas de módulo devem usar ``shared.auth_middleware.require_permission``.
Este módulo mantém ``get_current_user_with_roles`` para código legado e
adiciona ``get_current_user_with_permission``, que devolve o usuário já em
formato de dicionário para rotas escritas nesse estilo.
"""
from typing import Iterable, List, Union
from fastapi import Depends

from shared.auth_middleware import (
    UserContext,
    get_current_user,
    require_permission,
    require_role,
)
from shared.errors import ForbiddenError
from shared.permissions import PAPEL_MASTER


def get_current_user_with_roles(allowed_roles: Union[List[str], str]) -> callable:
    """Autoriza por papel e devolve o usuário como dicionário (legado)."""
    papeis = [allowed_roles] if isinstance(allowed_roles, str) else list(allowed_roles)

    def checker(user: UserContext = Depends(get_current_user)) -> dict:
        if PAPEL_MASTER not in user.papeis and not any(role in user.papeis for role in papeis):
            raise ForbiddenError("Permissão insuficiente.")
        return user.as_dict()

    return checker


def get_current_user_with_permission(*codigos: Union[str, Iterable[str]]) -> callable:
    """Autoriza por permissão de módulo e devolve o usuário como dicionário."""
    def checker(user: UserContext = Depends(require_permission(*codigos))) -> dict:
        return user.as_dict()

    return checker
