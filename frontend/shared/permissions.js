/**
 * A7SYSTEM - Catálogo de módulos e permissões (frontend).
 *
 * Espelha `backend/shared/permissions.py`. O catálogo real é carregado da API
 * (`GET /api/auth/permissoes`) logo após o login; o conteúdo abaixo é o
 * fallback usado enquanto a resposta não chega ou se a API estiver indisponível.
 *
 * Regra de ouro: este arquivo controla o que o usuário VÊ. Quem autoriza de
 * fato é o backend — toda rota exige a mesma permissão declarada aqui.
 */
(function () {
  const ACOES_LABEL = {
    ver: 'Visualizar',
    criar: 'Criar',
    editar: 'Editar',
    excluir: 'Excluir',
    exportar: 'Exportar',
    baixar: 'Dar baixa'
  };

  const MODULOS_PADRAO = [
    { id: 'dashboard',    nome: 'Dashboard',        icone: '📊', rota: '/dashboard',    pagina: 'DashboardPage',    ordem: 10,  acoes: ['ver', 'exportar'] },
    { id: 'empresas',     nome: 'Empresas',         icone: '🏢', rota: '/empresas',     pagina: 'EmpresasPage',     ordem: 20,  acoes: ['ver', 'criar', 'editar'] },
    { id: 'usuarios',     nome: 'Usuários',         icone: '👥', rota: '/usuarios',     pagina: 'UsuariosPage',     ordem: 30,  acoes: ['ver', 'criar', 'editar'] },
    { id: 'fornecedores', nome: 'Fornecedores',     icone: '🚚', rota: '/fornecedores', pagina: 'FornecedoresPage', ordem: 40,  acoes: ['ver', 'criar', 'editar', 'excluir'] },
    { id: 'clientes',     nome: 'Clientes',         icone: '🧑‍💼', rota: '/clientes',     pagina: 'ClientesPage',     ordem: 50,  acoes: ['ver', 'criar', 'editar', 'excluir'] },
    { id: 'produtos',     nome: 'Produtos',         icone: '📦', rota: '/produtos',     pagina: 'ProdutosPage',     ordem: 60,  acoes: ['ver', 'criar', 'editar'] },
    { id: 'estoque',      nome: 'Estoque',          icone: '🏭', rota: '/estoque',      pagina: 'EstoquePage',      ordem: 70,  acoes: ['ver'] },
    { id: 'saidas',       nome: 'Saídas e Ajustes', icone: '📉', rota: '/saidas',       pagina: 'SaidasPage',       ordem: 80,  acoes: ['ver', 'criar'] },
    { id: 'devolucoes',   nome: 'Devoluções',       icone: '🔄', rota: '/devolucoes',   pagina: 'DevolucoesPage',   ordem: 90,  acoes: ['ver', 'criar'] },
    { id: 'compras',      nome: 'Compras',          icone: '🛒', rota: '/compras',      pagina: 'ComprasPage',      ordem: 100, acoes: ['ver', 'criar'] },
    { id: 'contas_pagar', nome: 'Contas a Pagar',   icone: '💸', rota: '/contas-pagar', pagina: 'ContasPagarPage',  ordem: 110, acoes: ['ver', 'baixar'] },
    { id: 'vendas',       nome: 'Vendas',           icone: '🧾', rota: '/vendas',       pagina: 'VendasPage',       ordem: 120, acoes: ['ver', 'criar'] },
    { id: 'recebimentos', nome: 'Recebimentos',     icone: '💰', rota: '/recebimentos', pagina: 'RecebimentosPage', ordem: 130, acoes: ['ver', 'criar'] },
    { id: 'crm',          nome: 'CRM',              icone: '🤝', rota: '/crm',          pagina: 'CrmPage',          ordem: 140, acoes: ['ver'] }
  ];

  const PAPEIS_PADRAO = [
    { id: 'master',     nome: 'Master',        cor: 'danger',    descricao: 'Acesso irrestrito a todos os módulos.' },
    { id: 'adm',        nome: 'Administrador', cor: 'primary',   descricao: 'Opera todos os módulos; não cria empresas nem usuários.' },
    { id: 'financeiro', nome: 'Financeiro',    cor: 'info',      descricao: 'Contas a pagar, recebimentos e indicadores.' },
    { id: 'vendedor',   nome: 'Vendedor',      cor: 'success',   descricao: 'Vendas, clientes e CRM.' },
    { id: 'estoque',    nome: 'Estoque',       cor: 'warning',   descricao: 'Produtos, movimentações, compras e devoluções.' }
  ];

  const Permissoes = {
    acoesLabel: ACOES_LABEL,
    modulos: MODULOS_PADRAO.slice(),
    papeis: PAPEIS_PADRAO.slice(),
    carregado: false,

    /** Baixa o catálogo oficial da API. Silencioso: mantém o fallback em caso de erro. */
    carregar: async function () {
      try {
        const cat = await window.api.get('/auth/permissoes');
        if (cat && Array.isArray(cat.modulos) && cat.modulos.length) {
          Permissoes.modulos = cat.modulos.slice().sort((a, b) => a.ordem - b.ordem);
        }
        if (cat && Array.isArray(cat.papeis) && cat.papeis.length) {
          Permissoes.papeis = cat.papeis;
        }
        if (cat && Array.isArray(cat.acoes)) {
          cat.acoes.forEach(a => { Permissoes.acoesLabel[a.id] = a.nome; });
        }
        Permissoes.carregado = true;
      } catch (e) {
        console.warn('Catálogo de permissões não carregado; usando o padrão local.', e);
      }
      return Permissoes.modulos;
    },

    getModulo: function (id) {
      return Permissoes.modulos.find(m => m.id === id) || null;
    },

    getModuloPorRota: function (rota) {
      return Permissoes.modulos.find(m => m.rota === rota) || null;
    },

    getPapel: function (id) {
      return Permissoes.papeis.find(p => p.id === id) || null;
    },

    /** Todos os códigos "modulo:acao" do catálogo. */
    todasPermissoes: function () {
      return Permissoes.modulos.reduce(
        (acc, m) => acc.concat(m.acoes.map(a => `${m.id}:${a}`)),
        []
      );
    },

    /** Permissões concedidas por um preset de papel. */
    permissoesDoPapel: function (papelId) {
      if (papelId === 'master') return Permissoes.todasPermissoes();
      const papel = Permissoes.getPapel(papelId);
      return papel && Array.isArray(papel.permissoes) ? papel.permissoes.slice() : [];
    },

    /** União dos presets de vários papéis. */
    permissoesDosPapeis: function (papeis) {
      const conjunto = new Set();
      (papeis || []).forEach(p => Permissoes.permissoesDoPapel(p).forEach(c => conjunto.add(c)));
      return Array.from(conjunto);
    },

    rotulo: function (acao) {
      return Permissoes.acoesLabel[acao] || acao;
    }
  };

  window.Permissoes = Permissoes;
})();
