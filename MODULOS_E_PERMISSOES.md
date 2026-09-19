# A7SYSTEM — Módulos e Permissões

O sistema é organizado em **módulos**. Cada módulo tem um conjunto de **ações**, e
cada par módulo+ação é uma **permissão** com o código `modulo:acao`
(ex.: `vendas:criar`, `contas_pagar:baixar`).

As permissões de cada usuário são atribuídas **módulo a módulo** na tela
**Usuários**. Os papéis (`master`, `adm`, `financeiro`, `vendedor`, `estoque`)
continuam existindo, mas passaram a ser apenas **presets**: um atalho que
preenche a matriz de permissões, não uma regra espalhada pelo código.

## Onde fica cada coisa

| Arquivo | Papel |
|---|---|
| `backend/shared/permissions.py` | **Fonte da verdade**: módulos, ações, presets de papel e a resolução das permissões efetivas |
| `backend/shared/auth_middleware.py` | `require_permission(...)`, `require_module(...)`, `ensure_company_access(...)` |
| `GET /api/auth/permissoes` | Publica o catálogo para o frontend |
| `frontend/shared/permissions.js` | Espelho do catálogo (fallback offline) + helpers de UI |
| `frontend/app/js/app.js` | Monta menu e rotas a partir dos módulos permitidos |
| `frontend/app/js/pages/usuarios.js` | Matriz "módulo × ação" para atribuir permissões |
| `rules/firestore.rules` | Regras do Firestore alinhadas ao mesmo modelo (`hasPermission`) |

Um teste (`backend/tests/test_catalogo_frontend.py`) falha se o catálogo do
frontend divergir do backend.

## Módulos

| Módulo | Rota | Permissões | Endpoints protegidos |
|---|---|---|---|
| 📊 Dashboard | `/dashboard` | `dashboard:ver`, `dashboard:exportar` | `/api/dashboard/*` |
| 🏢 Empresas | `/empresas` | `empresas:ver`, `empresas:criar`, `empresas:editar` | `/api/companies/*` |
| 👥 Usuários | `/usuarios` | `usuarios:ver`, `usuarios:criar`, `usuarios:editar` | `/api/auth/users`, `/api/auth/register` |
| 🚚 Fornecedores | `/fornecedores` | `fornecedores:ver`, `fornecedores:criar`, `fornecedores:editar`, `fornecedores:excluir` | `/api/fornecedores/*` |
| 🧑‍💼 Clientes | `/clientes` | `clientes:ver`, `clientes:criar`, `clientes:editar`, `clientes:excluir` | `/api/clientes/*` |
| 📦 Produtos | `/produtos` | `produtos:ver`, `produtos:criar`, `produtos:editar` | `/api/products/*` |
| 🏭 Estoque | `/estoque` | `estoque:ver` | `/api/estoque/movimentacoes`, `/api/estoque/alertas` |
| 📉 Saídas e Ajustes | `/saidas` | `saidas:ver`, `saidas:criar` | `/api/estoque/saida` |
| 🔄 Devoluções | `/devolucoes` | `devolucoes:ver`, `devolucoes:criar` | `/api/estoque/devolucao`, `/api/estoque/devolucoes` |
| 🛒 Compras | `/compras` | `compras:ver`, `compras:criar` | `/api/purchases/*` |
| 💸 Contas a Pagar | `/contas-pagar` | `contas_pagar:ver`, `contas_pagar:baixar` | `/api/parcelas/*` |
| 🧾 Vendas | `/vendas` | `vendas:ver`, `vendas:criar` | `/api/sales/*` |
| 💰 Recebimentos | `/recebimentos` | `recebimentos:ver`, `recebimentos:criar` | `/api/sales/{id}/recebimento(s)` |
| 🤝 CRM | `/crm` | `crm:ver` | `/api/crm/*` |

Sem `modulo:ver` o módulo **não aparece no menu** e a rota é bloqueada.
O catálogo só contém permissões com endpoint correspondente — nada de permissão
que não autoriza nada.

## Papéis (presets)

| Papel | Módulos visíveis | Permissões concedidas |
|---|---|---|
| **Master** | Todos | Todas (33) — inclusive módulos criados no futuro |
| **Administrador** | Todos | 30 permissões (não cria empresa nem usuário) |
| **Financeiro** | Dashboard, Fornecedores, Clientes, Compras, Contas a Pagar, Vendas, Recebimentos | 10 permissões |
| **Vendedor** | Clientes, Produtos, Estoque, Compras, Vendas, Recebimentos, CRM | 11 permissões |
| **Estoque** | Fornecedores, Produtos, Estoque, Saídas e Ajustes, Devoluções, Compras, Vendas | 14 permissões |

## Como as permissões efetivas são calculadas

`resolve_permissions(papeis, permissoes)`, aplicado nesta ordem:

1. **`master`** → todas as permissões, sempre (inclusive módulos novos);
2. **permissões explícitas gravadas no usuário** → são as efetivas
   (é assim que se concede *ou retira* acesso módulo a módulo);
3. **sem permissões explícitas** → união dos presets dos papéis
   (compatibilidade com usuários criados antes desta mudança).

O mesmo cálculo roda no backend (a cada requisição, a partir do JWT) e no
frontend (para montar o menu). **Quem autoriza de fato é o backend** — esconder
um item do menu é só usabilidade.

### Quando a mudança entra em vigor

As permissões viajam no JWT, então alterar o acesso de alguém passa a valer **no
próximo login** daquele usuário (o token dura `ACCESS_TOKEN_EXPIRE_MINUTES`,
hoje 480 minutos). Para revogação imediata, reduza esse tempo de expiração ou
desative a conta (`ativo = false`), que bloqueia o próximo login.

## Multi-empresa

Permissão e empresa são checagens independentes. Toda rota que opera sobre dados
de uma empresa chama `ensure_company_access(user, empresa_id)`, que confirma se a
empresa está nas do usuário (`master` acessa qualquer uma). Antes isso estava
repetido em ~25 lugares com variações; agora é um helper só.

## Como adicionar um módulo novo

1. Declare o módulo em `MODULOS` (`backend/shared/permissions.py`) com rota,
   página, ícone, ordem e ações;
2. Espelhe a entrada em `frontend/shared/permissions.js` (o teste de sincronia
   cobra isso);
3. Proteja as rotas com `Depends(require_permission("modulo:acao"))`;
4. Crie `window.<Pagina>` com um método `render()` e inclua o script em
   `frontend/app/index.html`.

Menu, rota e a matriz da tela de Usuários passam a mostrar o módulo
automaticamente — nenhum `switch` ou lista de papéis precisa ser tocado.

## Banco de dados

A tabela `usuarios` ganhou a coluna `permissoes TEXT[]`. `backend/init_db.py`
cria a coluna em bancos novos e roda `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
nos existentes — usuários antigos ficam com o array vazio e continuam usando os
presets dos papéis até receberem permissões personalizadas.
