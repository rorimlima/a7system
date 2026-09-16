/**
 * A7SYSTEM - Controlador Principal e Router da SPA
 */

class AppController {
  constructor() {
    this.currentUser = null;
    this.empresaAtiva = localStorage.getItem('a7_empresa_ativa');
    this.claims = null;
    
    this.init();
  }

  init() {
    // Escutar mudanças de autenticação
    window.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUser = user;
        
        // Obter Claims
        const idTokenResult = await user.getIdTokenResult();
        this.claims = idTokenResult.claims;
        
        this.showApp();
        await this.loadEmpresas();
        
        // Atualizar perfil
        document.getElementById('user-profile-name').innerText = user.email;
        
        // Lidar com refresh do token periodicamente (50 min)
        this.startTokenRefresh();
        
        // Forçar rota caso vazia
        if(!window.location.hash || window.location.hash === '#/login') {
          this.navigate('/dashboard');
        } else {
          this.handleRoute();
        }
      } else {
        this.currentUser = null;
        this.claims = null;
        this.showLogin();
      }
    });

    // Eventos do formulário de Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const senha = document.getElementById('login-senha').value;
      
      this.showLoading();
      try {
        await window.auth.signInWithEmailAndPassword(email, senha);
        this.showToast('Login efetuado com sucesso!', 'success');
      } catch (err) {
        this.showToast('Erro ao acessar: ' + err.message, 'error');
      } finally {
        this.hideLoading();
      }
    });

    // Evento Logout
    document.getElementById('btn-logout').addEventListener('click', () => this.logout());

    // Mudança de Empresa
    document.getElementById('empresa-selector').addEventListener('change', (e) => {
      this.empresaAtiva = e.target.value;
      localStorage.setItem('a7_empresa_ativa', this.empresaAtiva);
      this.showToast('Empresa trocada com sucesso.', 'info');
      this.handleRoute(); // recarrega a página com novo escopo
    });

    // Escutar mudanças no Hash (Routing)
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  showApp() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    // Esconder/mostrar itens do menu baseado em papéis
    document.querySelectorAll('.nav-item').forEach(el => {
      const allowedRoles = el.getAttribute('data-roles');
      if (allowedRoles) {
        const rolesArr = allowedRoles.split(',');
        const hasAccess = rolesArr.some(r => this.hasRole(r.trim()));
        if (!hasAccess) {
          el.parentElement.style.display = 'none';
        } else {
          el.parentElement.style.display = '';
        }
      }
    });
  }

  showLogin() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    if (window.LoginPage) {
      window.LoginPage.render();
    }
    window.location.hash = '#/login';
  }

  async logout() {
    await window.auth.signOut();
    localStorage.removeItem('a7_empresa_ativa');
    this.empresaAtiva = null;
    this.showLogin();
  }

  async loadEmpresas() {
    // Placeholder para carregar empresas baseadas nos claims ou API
    // Se fossem claims: this.claims.empresasIds
    const select = document.getElementById('empresa-selector');
    
    // Mock carregamento - na real chamaria a API ou leria firestore
    try {
      // Exemplo API call: const empresas = await window.api.get('/empresas/minhas');
      const empresas = [
        { id: 'emp_1', nome: 'A7SYSTEM - Matriz' },
        { id: 'emp_2', nome: 'A7SYSTEM - Filial 1' }
      ];

      select.innerHTML = empresas.map(emp => 
        `<option value="${emp.id}" ${this.empresaAtiva === emp.id ? 'selected' : ''}>${emp.nome}</option>`
      ).join('');

      if (!this.empresaAtiva && empresas.length > 0) {
        this.empresaAtiva = empresas[0].id;
        localStorage.setItem('a7_empresa_ativa', this.empresaAtiva);
      }
    } catch(err) {
      console.error(err);
      select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
  }

  navigate(path) {
    window.location.hash = '#' + path;
  }

  handleRoute() {
    if(!this.currentUser) return;

    const hash = window.location.hash || '#/dashboard';
    const path = hash.replace('#', '');
    
    // Highlight nav item
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.remove('active');
      if (el.getAttribute('data-path') === path) {
        el.classList.add('active');
      }
    });

    // Validar empresa ativa
    if (!this.empresaAtiva && path !== '/empresas') {
      this.renderPage('Por favor, selecione uma empresa no topo para continuar.');
      return;
    }

    // Roteador simples
    const contentArea = document.getElementById('page-content');
    contentArea.innerHTML = `<div style="text-align: center; padding: 2rem;">Carregando...</div>`;

    switch(path) {
      case '/dashboard':
        this.renderDashboard();
        break;
      case '/usuarios':
        if (this.hasRole('master') || this.hasRole('adm')) {
          if (window.UsuariosPage) window.UsuariosPage.render();
        } else {
          this.showToast('Sem permissão para acessar esta página.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/empresas':
        if (this.hasRole('master') || this.hasRole('adm')) {
          if (window.EmpresasPage) window.EmpresasPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/fornecedores':
        if (this.hasRole('master') || this.hasRole('adm') || this.hasRole('estoque')) {
          if (window.FornecedoresPage) window.FornecedoresPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/clientes':
        if (this.hasRole('master') || this.hasRole('adm') || this.hasRole('vendedor')) {
          if (window.ClientesPage) window.ClientesPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/produtos':
        if (window.ProdutosPage) window.ProdutosPage.render();
        break;
      case '/compras':
        if (this.hasRole('master') || this.hasRole('adm') || this.hasRole('estoque')) {
          if (window.ComprasPage) window.ComprasPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/contas-pagar':
        if (this.hasRole('master') || this.hasRole('adm')) {
          if (window.ContasPagarPage) window.ContasPagarPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/vendas':
        // Exemplo genérico de página sendo montada
        contentArea.innerHTML = window.UI.createCard(`Página: ${path.substring(1).toUpperCase()}`, `<p>Módulo em desenvolvimento.</p>`);
        break;
      default:
        contentArea.innerHTML = `<h2>404 - Página não encontrada</h2>`;
    }
  }

  hasRole(role) {
    return this.claims && this.claims.papeis && this.claims.papeis.includes(role);
  }

  renderPage(html) {
    document.getElementById('page-content').innerHTML = html;
  }

  renderDashboard() {
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">Visão Geral</h2>
        <span style="color: #6B7280; font-size: 0.9rem;">Atualizado agora</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        ${window.UI ? window.UI.createStatsCard('Vendas do Mês', 'R$ 84.530,00', '📈', '+15% em relação ao mês anterior') : ''}
        ${window.UI ? window.UI.createStatsCard('Clientes Ativos', '312', '👥', '+5 novos clientes hoje') : ''}
        ${window.UI ? window.UI.createStatsCard('Contas a Receber', 'R$ 22.400,00', '💰', 'Recebimentos previstos para hoje') : ''}
        ${window.UI ? window.UI.createStatsCard('Contas a Pagar', 'R$ 5.200,00', '⚠️', 'Vencendo nos próximos 7 dias') : ''}
      </div>
      
      <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem;">
        <div class="card-header" style="margin-bottom: 1rem;"><h3 class="card-title" style="margin: 0;">Últimas Movimentações</h3></div>
        ${window.UI ? window.UI.createTable(
          ['Data', 'Descrição', 'Valor', 'Status'],
          [
            { id: 1, data: ['16/09/2026', 'Venda #1042 - Cliente X', 'R$ 2.500,00', window.UI.createBadge('Concluído', 'success')] },
            { id: 2, data: ['15/09/2026', 'Pagamento Fornecedor Y', 'R$ -1.200,00', window.UI.createBadge('Pago', 'info')] },
            { id: 3, data: ['15/09/2026', 'Venda #1041 - Cliente Z', 'R$ 450,00', window.UI.createBadge('Pendente', 'warning')] }
          ]
        ) : ''}
      </div>
    `;
    this.renderPage(html);
  }

  // ==== Utils Globais UI ====
  showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
  hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showModal(htmlContent) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-content').innerHTML = htmlContent;
    overlay.classList.add('active');
  }

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
  }

  startTokenRefresh() {
    // Auto atualiza token a cada 50 minutos (3000000 ms) para evitar expiração em sessões ativas
    setInterval(async () => {
      if (this.currentUser) {
        await this.currentUser.getIdToken(true);
        console.log("Token renovado preventivamente.");
      }
    }, 3000000);
  }
}

// Inicializar App Controller e expor no window
window.appController = new AppController();
