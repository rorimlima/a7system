/**
 * A7SYSTEM - Controlador Principal e Router da SPA
 *
 * O app é modular: menu, rotas e telas saem do catálogo em
 * `frontend/shared/permissions.js` (espelho de `backend/shared/permissions.py`).
 * Cada módulo tem a permissão `modulo:acao` que o backend também exige, então
 * esconder um item aqui nunca é a única barreira — é só a camada de usabilidade.
 */

class AppController {
  constructor() {
    this.currentUser = null;
    this.empresaAtiva = localStorage.getItem('a7_empresa_ativa');
    this.claims = null;
    this.permissoes = [];

    this.init();
  }

  init() {
    // 1. Verifica se há sessão JWT salva
    const savedToken = localStorage.getItem('a7_token');
    const savedUserStr = localStorage.getItem('a7_user');

    if (savedToken && savedUserStr) {
      try {
        const user = JSON.parse(savedUserStr);
        this.setSession(user);
        this.showApp();
        this.loadEmpresas();

        const profileName = document.getElementById('user-profile-name');
        if (profileName) profileName.innerText = user.nome || user.email;

        this.bindEventos();
        this.startRouting();
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
          this.setSession({
            nome: user.email,
            email: user.email,
            papeis: idTokenResult.claims.papeis || [],
            permissoes: idTokenResult.claims.permissoes || null,
            empresasIds: idTokenResult.claims.empresasIds || []
          });
          this.showApp();
          await this.loadEmpresas();
          const profileName = document.getElementById('user-profile-name');
          if (profileName) profileName.innerText = user.email;
          this.startRouting();
        } else {
          this.currentUser = null;
          this.claims = null;
          this.permissoes = [];
          this.showLogin();
        }
      });
    } else {
      this.currentUser = null;
      this.claims = null;
      this.permissoes = [];
      this.showLogin();
    }

    this.bindEventos();
  }

  /**
   * Guarda usuário, papéis e permissões efetivas da sessão.
   * Sessões antigas (sem `permissoes`) caem nos presets dos papéis, igual ao backend.
   */
  setSession(user) {
    this.currentUser = user;
    const papeis = user.papeis || [];
    let permissoes = user.permissoes;
    if (!Array.isArray(permissoes) || permissoes.length === 0) {
      permissoes = window.Permissoes ? window.Permissoes.permissoesDosPapeis(papeis) : [];
    }
    this.permissoes = permissoes;
    this.claims = { papeis, permissoes, empresasIds: user.empresasIds || [] };
  }

  /** Carrega o catálogo do backend e só então monta menu e rota inicial. */
  async startRouting() {
    if (window.Permissoes && !window.Permissoes.carregado) {
      await window.Permissoes.carregar();
      // O catálogo pode ter chegado depois da sessão: recalcula os presets.
      if (this.currentUser) this.setSession(this.currentUser);
    }
    this.buildMenu();

    if (!window.location.hash || window.location.hash === '#/login') {
      this.navigate(this.rotaInicial());
    } else {
      this.handleRoute();
    }
  }

  bindEventos() {
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

  // ==== Permissões =========================================================

  /** Papel do usuário (use `can()` para decidir acesso a funcionalidade). */
  hasRole(role) {
    return !!(this.claims && this.claims.papeis && this.claims.papeis.includes(role));
  }

  /** O usuário possui a permissão `modulo:acao`? */
  can(codigo) {
    return Array.isArray(this.permissoes) && this.permissoes.includes(codigo);
  }

  /** O usuário possui ao menos uma das permissões informadas? */
  canAny(...codigos) {
    return codigos.some(c => this.can(c));
  }

  /** O usuário pode abrir o módulo (tem a ação `ver`)? */
  canModule(moduloId) {
    return this.can(`${moduloId}:ver`);
  }

  /** Módulos visíveis para o usuário, na ordem do menu. */
  modulosDisponiveis() {
    if (!window.Permissoes) return [];
    return window.Permissoes.modulos.filter(m => this.canModule(m.id));
  }

  /** Primeira rota que o usuário pode abrir (evita cair numa tela proibida). */
  rotaInicial() {
    const modulos = this.modulosDisponiveis();
    return modulos.length ? modulos[0].rota : '/sem-acesso';
  }

  // ==== Menu e rotas =======================================================

  /** Monta o menu lateral a partir dos módulos permitidos. */
  buildMenu() {
    const lista = document.getElementById('sidebar-nav-list');
    if (!lista) return;

    const modulos = this.modulosDisponiveis();
    if (!modulos.length) {
      lista.innerHTML = '<li class="nav-empty">Nenhum módulo liberado para o seu usuário.</li>';
      return;
    }

    lista.innerHTML = modulos.map(m => `
      <li>
        <a href="#${m.rota}" class="nav-item" data-path="${m.rota}" data-modulo="${m.id}" title="${m.descricao || m.nome}">
          <span class="nav-icon">${m.icone || '•'}</span> ${m.nome}
        </a>
      </li>
    `).join('');

    // Fechar o drawer ao navegar em telas menores
    lista.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth < 1025) this.closeSidebar();
      });
    });

    this.highlightMenu(window.location.hash.replace('#', ''));
  }

  highlightMenu(path) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-path') === path);
    });
  }

  showApp() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    this.buildMenu();
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
    this.permissoes = [];
    this.empresaAtiva = null;
    if (window.auth && typeof window.auth.signOut === 'function') {
      try { await window.auth.signOut(); } catch (e) {}
    }
    this.showLogin();
  }

  async loadEmpresas() {
    const select = document.getElementById('empresa-selector');
    if (!select) return;

    try {
      const empresas = await window.api.get('/companies/');
      const lista = (Array.isArray(empresas) ? empresas : []).map(emp => ({
        id: emp.id || emp.uid,
        nome: emp.nomeFantasia || emp.nome || emp.razaoSocial || emp.id
      }));

      if (!lista.length) {
        select.innerHTML = '<option value="">Nenhuma empresa disponível</option>';
        return;
      }

      select.innerHTML = lista.map(emp =>
        `<option value="${emp.id}" ${this.empresaAtiva === emp.id ? 'selected' : ''}>${emp.nome}</option>`
      ).join('');

      if (!this.empresaAtiva || !lista.some(e => e.id === this.empresaAtiva)) {
        this.empresaAtiva = lista[0].id;
        localStorage.setItem('a7_empresa_ativa', this.empresaAtiva);
        select.value = this.empresaAtiva;
      }
    } catch (err) {
      console.error(err);
      // Sem permissão em Empresas ainda é possível operar com a empresa do login
      const doUsuario = (this.claims && this.claims.empresasIds) || [];
      if (doUsuario.length) {
        select.innerHTML = doUsuario.map(id =>
          `<option value="${id}" ${this.empresaAtiva === id ? 'selected' : ''}>${id}</option>`
        ).join('');
        if (!this.empresaAtiva) {
          this.empresaAtiva = doUsuario[0];
          localStorage.setItem('a7_empresa_ativa', this.empresaAtiva);
        }
      } else {
        select.innerHTML = '<option value="">Erro ao carregar</option>';
      }
    }
  }

  navigate(path) {
    window.location.hash = '#' + path;
  }

  /**
   * Roteador: cada rota é um módulo do catálogo e exige `modulo:ver`.
   * Sem permissão, o usuário é levado ao primeiro módulo a que tem acesso.
   */
  handleRoute() {
    if (!this.currentUser) return;

    // No mobile, fecha o sidebar drawer ao navegar
    if (window.innerWidth < 1025) {
      this.closeSidebar();
    }

    const hash = window.location.hash || '#' + this.rotaInicial();
    const path = hash.replace('#', '');

    this.highlightMenu(path);

    const contentArea = document.getElementById('page-content');
    const modulo = window.Permissoes ? window.Permissoes.getModuloPorRota(path) : null;

    if (!modulo) {
      contentArea.innerHTML = this.modulosDisponiveis().length
        ? `<h2>404 - Página não encontrada</h2>`
        : `<h2>Sem acesso</h2><p>Nenhum módulo foi liberado para o seu usuário. Procure um administrador.</p>`;
      return;
    }

    if (!this.canModule(modulo.id)) {
      this.showToast(`Sem permissão para acessar ${modulo.nome}.`, 'error');
      const destino = this.rotaInicial();
      if (destino !== path) this.navigate(destino);
      return;
    }

    // Validar empresa ativa (Empresas é a única tela utilizável sem escopo)
    if (!this.empresaAtiva && modulo.id !== 'empresas') {
      this.renderPage('Por favor, selecione uma empresa no topo para continuar.');
      return;
    }

    const page = window[modulo.pagina];
    if (!page || typeof page.render !== 'function') {
      contentArea.innerHTML = `<h2>${modulo.nome} temporariamente indisponível.</h2>`;
      return;
    }

    contentArea.innerHTML = `<div style="text-align: center; padding: 2rem;">Carregando...</div>`;
    page.render();
  }

  renderPage(html) {
    document.getElementById('page-content').innerHTML = html;
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
}

// Inicializar App Controller e expor no window
window.appController = new AppController();
