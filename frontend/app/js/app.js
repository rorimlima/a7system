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
    // 1. Verifica se há sessão JWT salva
    const savedToken = localStorage.getItem('a7_token');
    const savedUserStr = localStorage.getItem('a7_user');

    if (savedToken && savedUserStr) {
      try {
        const user = JSON.parse(savedUserStr);
        this.currentUser = user;
        this.claims = { papeis: user.papeis || [], empresasIds: user.empresasIds || [] };
        this.showApp();
        this.loadEmpresas();
        
        const profileName = document.getElementById('user-profile-name');
        if (profileName) profileName.innerText = user.nome || user.email;

        if (!window.location.hash || window.location.hash === '#/login') {
          this.navigate('/dashboard');
        } else {
          this.handleRoute();
        }
        return;
      } catch (e) {
        this.logout();
      }
    }

    // 2. Fallback Firebase Auth se configurado
    if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
      window.auth.onAuthStateChanged(async (user) => {
        if (user) {
          this.currentUser = user;
          const idTokenResult = await user.getIdTokenResult();
          this.claims = idTokenResult.claims;
          this.showApp();
          await this.loadEmpresas();
          const profileName = document.getElementById('user-profile-name');
          if (profileName) profileName.innerText = user.email;
          if (!window.location.hash || window.location.hash === '#/login') {
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
    } else {
      this.currentUser = null;
      this.claims = null;
      this.showLogin();
    }

    // Eventos do formulário de Login (se presente no DOM estático)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
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
    }

    // Evento Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.logout());
    }

    // Mudança de Empresa
    const empresaSelector = document.getElementById('empresa-selector');
    if (empresaSelector) {
      empresaSelector.addEventListener('change', (e) => {
        this.empresaAtiva = e.target.value;
        localStorage.setItem('a7_empresa_ativa', this.empresaAtiva);
        this.showToast('Empresa trocada com sucesso.', 'info');
        this.handleRoute(); // recarrega a página com novo escopo
      });
    }

    // Navegação Mobile (Drawer) e Eventos de UI
    this.initMobileNavigation();

    // Fechar modal ao clicar fora
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          this.closeModal();
        }
      });
    }

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
    localStorage.removeItem('a7_token');
    localStorage.removeItem('a7_user');
    localStorage.removeItem('a7_empresa_ativa');
    this.currentUser = null;
    this.claims = null;
    this.empresaAtiva = null;
    if (window.auth && typeof window.auth.signOut === 'function') {
      try { await window.auth.signOut(); } catch(e) {}
    }
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

    // No mobile, fecha o sidebar drawer ao navegar
    if (window.innerWidth < 1025) {
      this.closeSidebar();
    }

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
      case '/estoque':
        if (this.hasRole('master') || this.hasRole('adm') || this.hasRole('estoque')) {
          if (window.EstoquePage) window.EstoquePage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/saidas':
        if (this.hasRole('master') || this.hasRole('adm') || this.hasRole('estoque')) {
          if (window.SaidasPage) window.SaidasPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/devolucoes':
        if (this.hasRole('master') || this.hasRole('adm') || this.hasRole('estoque')) {
          if (window.DevolucoesPage) window.DevolucoesPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
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
        if (this.hasRole('master') || this.hasRole('adm') || this.hasRole('vendedor')) {
          if (window.VendasPage) window.VendasPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/recebimentos':
        if (this.hasRole('master') || this.hasRole('adm')) {
          if (window.RecebimentosPage) window.RecebimentosPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
        break;
      case '/crm':
        if (this.hasRole('master') || this.hasRole('adm') || this.hasRole('vendedor')) {
          if (window.CrmPage) window.CrmPage.render();
        } else {
          this.showToast('Sem permissão.', 'error');
          this.navigate('/dashboard');
        }
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
    if (window.DashboardPage) {
      window.DashboardPage.render();
    } else {
      this.renderPage('<h2>Dashboard temporariamente indisponível.</h2>');
    }
  }

  // ==== Métodos de Controle do Menu Mobile (Drawer) ====
  initMobileNavigation() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeSidebar());
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeSidebar());
    }

    // Tecla Escape fecha drawer e modais
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSidebar();
        this.closeModal();
      }
    });

    // Fechar ao clicar em itens de navegação em viewports menores
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth < 1025) {
          this.closeSidebar();
        }
      });
    });
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btn = document.getElementById('mobile-menu-btn');
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btn = document.getElementById('mobile-menu-btn');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    if (btn) btn.setAttribute('aria-expanded', 'false');
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
