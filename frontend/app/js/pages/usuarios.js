/**
 * A7SYSTEM - Página de Gestão de Usuários
 *
 * Aqui as permissões são atribuídas MÓDULO A MÓDULO: a matriz abaixo é montada
 * a partir do catálogo (`window.Permissoes`), que vem do backend. Os papéis
 * funcionam como atalho — clicar num preset marca as permissões daquele papel,
 * e a partir daí o administrador ajusta o que quiser.
 */
const UsuariosPage = {
  users: [],

  render: async () => {
    if (!window.appController || !window.appController.can('usuarios:ver')) {
      if (window.appController) {
        window.appController.showToast('Sem permissão para acessar esta página.', 'error');
        window.appController.navigate(window.appController.rotaInicial());
      }
      return;
    }

    const contentArea = document.getElementById('page-content');

    let btnNovoHTML = '';
    if (window.appController.can('usuarios:criar')) {
      btnNovoHTML = `<button id="btn-novo-usuario" class="btn btn-primary" style="background-color: var(--color-primary, #DC2626); color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Novo Usuário</button>`;
    }

    contentArea.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0; color: #111827;">Gestão de Usuários</h2>
        ${btnNovoHTML}
      </div>

      <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1rem;">
        <div style="margin-bottom: 1.5rem;">
          <input type="text" id="busca-usuario" class="form-control" placeholder="Buscar por nome ou e-mail..." style="width: 100%; max-width: 400px; padding: 0.5rem 1rem; border: 1px solid #D1D5DB; border-radius: 4px;">
        </div>
        <div id="usuarios-table-container">
          <div style="text-align: center; padding: 2rem; color: #6B7280;">Carregando usuários...</div>
        </div>
      </div>
    `;

    const btnNovo = document.getElementById('btn-novo-usuario');
    if (btnNovo) btnNovo.addEventListener('click', UsuariosPage.openNewUserModal);

    document.getElementById('busca-usuario').addEventListener('input', (e) => {
      UsuariosPage.renderTable(e.target.value);
    });

    await UsuariosPage.loadUsers();
  },

  loadUsers: async () => {
    try {
      if (window.appController) window.appController.showLoading();

      const res = await window.api.get('/auth/users');
      UsuariosPage.users = Array.isArray(res) ? res : (res.data || []);

      UsuariosPage.renderTable();
    } catch (err) {
      UsuariosPage.users = [];
      UsuariosPage.renderTable();
      if (window.appController) window.appController.showToast('Erro ao carregar usuários.', 'error');
    } finally {
      if (window.appController) window.appController.hideLoading();
    }
  },

  // ==== Matriz de permissões por módulo ====================================

  /** Permissões efetivas de um usuário já retornadas pela API. */
  permissoesEfetivas: (u) => {
    if (Array.isArray(u.permissoesEfetivas) && u.permissoesEfetivas.length) return u.permissoesEfetivas;
    if (Array.isArray(u.permissoes) && u.permissoes.length) return u.permissoes;
    return window.Permissoes ? window.Permissoes.permissoesDosPapeis(u.papeis || []) : [];
  },

  /** Quantos módulos o usuário enxerga (coluna-resumo da tabela). */
  resumoModulos: (u) => {
    const efetivas = UsuariosPage.permissoesEfetivas(u);
    const modulos = (window.Permissoes ? window.Permissoes.modulos : [])
      .filter(m => efetivas.includes(`${m.id}:ver`));
    if (!modulos.length) return '<span style="color:#9CA3AF;">Nenhum módulo</span>';
    const total = window.Permissoes ? window.Permissoes.modulos.length : modulos.length;
    const nomes = modulos.map(m => m.nome).join(', ');
    return `<span title="${nomes}">${modulos.length} de ${total} módulos</span>`;
  },

  /**
   * Grade "módulo x ação" com checkboxes.
   * @param {string} prefixo - prefixo dos ids/classes (nu = novo, eu = edição)
   * @param {string[]} selecionadas - permissões marcadas
   */
  renderMatriz: (prefixo, selecionadas) => {
    const marcadas = new Set(selecionadas || []);
    const modulos = window.Permissoes ? window.Permissoes.modulos : [];

    const presets = (window.Permissoes ? window.Permissoes.papeis : [])
      .map(p => `<button type="button" class="${prefixo}-preset" data-papel="${p.id}" title="${p.descricao || ''}"
          style="padding: 0.25rem 0.6rem; border: 1px solid #D1D5DB; background: white; border-radius: 999px; cursor: pointer; font-size: 0.8rem;">${p.nome}</button>`)
      .join(' ');

    const linhas = modulos.map(m => {
      const acoes = m.acoes.map(acao => {
        const codigo = `${m.id}:${acao}`;
        const rotulo = window.Permissoes ? window.Permissoes.rotulo(acao) : acao;
        return `
          <label style="cursor:pointer; display:inline-flex; align-items:center; gap:0.3rem; margin-right: 0.75rem; font-size: 0.85rem;">
            <input type="checkbox" class="${prefixo}-perm" data-modulo="${m.id}" data-acao="${acao}" value="${codigo}" ${marcadas.has(codigo) ? 'checked' : ''}>
            ${rotulo}
          </label>`;
      }).join('');

      return `
        <tr style="border-bottom: 1px solid #F3F4F6;">
          <td style="padding: 0.5rem 0.75rem; white-space: nowrap;">
            <label style="cursor:pointer; display:inline-flex; align-items:center; gap:0.4rem; font-weight: 600; font-size: 0.85rem;">
              <input type="checkbox" class="${prefixo}-modulo-todos" data-modulo="${m.id}">
              <span>${m.icone || ''} ${m.nome}</span>
            </label>
          </td>
          <td style="padding: 0.5rem 0.75rem;">${acoes}</td>
        </tr>`;
    }).join('');

    return `
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight: bold;">Permissões por módulo</label>
        <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap; margin-bottom: 0.6rem;">
          <span style="font-size:0.8rem; color:#6B7280;">Aplicar preset:</span>
          ${presets}
          <button type="button" id="${prefixo}-limpar" style="padding: 0.25rem 0.6rem; border: 1px solid #D1D5DB; background: white; border-radius: 999px; cursor: pointer; font-size: 0.8rem; color:#B91C1C;">Limpar tudo</button>
        </div>
        <div style="max-height: 260px; overflow-y: auto; border: 1px solid #E5E7EB; border-radius: 4px; background: #F9FAFB;">
          <table style="width:100%; border-collapse: collapse;">
            <tbody>${linhas}</tbody>
          </table>
        </div>
        <small id="${prefixo}-resumo" style="display:block; margin-top:0.4rem; color:#6B7280;"></small>
      </div>`;
  },

  /** Callbacks de atualização da matriz, por prefixo de formulário. */
  _atualizarMatriz: {},

  /** Liga presets, "marcar módulo inteiro" e o resumo da matriz. */
  bindMatriz: (prefixo) => {
    const checkboxes = () => Array.from(document.querySelectorAll(`.${prefixo}-perm`));

    const atualizarResumo = () => {
      const marcadas = checkboxes().filter(c => c.checked);
      const modulosVisiveis = marcadas.filter(c => c.dataset.acao === 'ver').length;
      const resumo = document.getElementById(`${prefixo}-resumo`);
      if (resumo) {
        resumo.innerText = `${marcadas.length} permissões marcadas · ${modulosVisiveis} módulos visíveis no menu.`;
      }
      document.querySelectorAll(`.${prefixo}-modulo-todos`).forEach(master => {
        const doModulo = checkboxes().filter(c => c.dataset.modulo === master.dataset.modulo);
        master.checked = doModulo.length > 0 && doModulo.every(c => c.checked);
        master.indeterminate = !master.checked && doModulo.some(c => c.checked);
      });
    };

    const aplicar = (codigos) => {
      const conjunto = new Set(codigos);
      checkboxes().forEach(c => { c.checked = conjunto.has(c.value); });
      atualizarResumo();
    };

    document.querySelectorAll(`.${prefixo}-preset`).forEach(btn => {
      btn.addEventListener('click', () => {
        aplicar(window.Permissoes ? window.Permissoes.permissoesDoPapel(btn.dataset.papel) : []);
      });
    });

    const btnLimpar = document.getElementById(`${prefixo}-limpar`);
    if (btnLimpar) btnLimpar.addEventListener('click', () => aplicar([]));

    document.querySelectorAll(`.${prefixo}-modulo-todos`).forEach(master => {
      master.addEventListener('change', () => {
        checkboxes()
          .filter(c => c.dataset.modulo === master.dataset.modulo)
          .forEach(c => { c.checked = master.checked; });
        atualizarResumo();
      });
    });

    UsuariosPage._atualizarMatriz[prefixo] = atualizarResumo;

    checkboxes().forEach(c => c.addEventListener('change', () => {
      // Sem "ver" o módulo não aparece no menu: marcar qualquer ação implica vê-lo.
      if (c.checked && c.dataset.acao !== 'ver') {
        const ver = checkboxes().find(x => x.dataset.modulo === c.dataset.modulo && x.dataset.acao === 'ver');
        if (ver) ver.checked = true;
      }
      atualizarResumo();
    }));

    atualizarResumo();
  },

  coletarPermissoes: (prefixo) =>
    Array.from(document.querySelectorAll(`.${prefixo}-perm:checked`)).map(el => el.value),

  renderPapeisCheckboxes: (prefixo, papeisAtuais) => {
    const papeis = window.Permissoes ? window.Permissoes.papeis : [];
    const atuais = papeisAtuais || [];
    const podeConcederMaster = window.appController && window.appController.hasRole('master');

    return papeis
      .filter(p => p.id !== 'master' || podeConcederMaster)
      .map(p => `
        <label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;" title="${p.descricao || ''}">
          <input type="checkbox" class="${prefixo}-role" value="${p.id}" ${atuais.includes(p.id) ? 'checked' : ''}> ${p.nome}
        </label>`)
      .join('');
  },

  // ==== Tabela =============================================================

  renderTable: (filtro = '') => {
    const container = document.getElementById('usuarios-table-container');
    if (!container) return;

    const term = filtro.toLowerCase();
    const filtered = UsuariosPage.users.filter(u =>
      (u.nome && u.nome.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    );

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #6B7280; background: #F9FAFB; border-radius: 4px;">Nenhum usuário encontrado.</div>`;
      return;
    }

    const headers = ['Nome', 'E-mail', 'Papéis', 'Acesso', 'Status', 'Ações'];
    const podeEditar = window.appController && window.appController.can('usuarios:editar');

    const rows = filtered.map(u => {
      const papeisBadges = u.papeis && u.papeis.length ? u.papeis.map(p => {
        const papel = window.Permissoes ? window.Permissoes.getPapel(p) : null;
        const cor = papel ? papel.cor : 'secondary';
        const nome = papel ? papel.nome : p;
        return window.UI ? window.UI.createBadge(nome.toUpperCase(), cor) : nome;
      }).join(' ') : '<span style="color:#9CA3AF;">—</span>';

      const statusBadge = u.ativo !== false
        ? (window.UI ? window.UI.createBadge('Ativo', 'success') : 'Ativo')
        : (window.UI ? window.UI.createBadge('Inativo', 'danger') : 'Inativo');

      let acoes = '-';
      if (podeEditar) {
        acoes = `
          <button class="btn btn-sm" style="background-color: #3B82F6; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; margin-right: 0.25rem;" onclick="UsuariosPage.openEditUserModal('${u.uid}')">Editar</button>
          <button class="btn btn-sm" style="background-color: ${u.ativo !== false ? '#EF4444' : '#10B981'}; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;" onclick="UsuariosPage.toggleUserStatus('${u.uid}', ${u.ativo !== false ? 'false' : 'true'})">${u.ativo !== false ? 'Desativar' : 'Ativar'}</button>
        `;
      }

      return {
        id: u.uid,
        data: [
          u.nome || '-',
          u.email,
          papeisBadges,
          UsuariosPage.resumoModulos(u),
          statusBadge,
          acoes
        ]
      };
    });

    if (window.UI) {
      container.innerHTML = window.UI.createTable(headers, rows);
    } else {
      container.innerHTML = `<p>Exibindo ${filtered.length} usuários.</p>`;
    }
  },

  validatePasswordStrength: (senha) => {
    let score = 0;
    if (!senha) return { score: 0, label: '', color: '#E5E7EB' };

    if (senha.length >= 8) score++;
    if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) score++;
    if (/\d/.test(senha)) score++;
    if (/[^A-Za-z0-9]/.test(senha)) score++;

    if (score < 2) return { score, label: 'Fraca', color: '#EF4444' };
    if (score === 2 || score === 3) return { score, label: 'Média', color: '#F59E0B' };
    return { score, label: 'Forte', color: '#10B981' };
  },

  /** Empresas disponíveis para marcar no formulário. */
  renderEmpresasCheckboxes: (classe, selecionadas) => {
    const mainSelect = document.getElementById('empresa-selector');
    const atuais = selecionadas || [];
    let html = '';
    if (mainSelect && mainSelect.options.length > 0) {
      Array.from(mainSelect.options).forEach(opt => {
        if (opt.value) {
          html += `<label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="${classe}" value="${opt.value}" ${atuais.includes(opt.value) ? 'checked' : ''}> ${opt.text}</label>`;
        }
      });
    }
    return html || '<span style="color:#6B7280;">Nenhuma empresa disponível.</span>';
  },

  // ==== Modais =============================================================

  openNewUserModal: () => {
    const html = `
      <div style="padding: 1.5rem; width: 100%; max-width: 560px; box-sizing: border-box;">
        <h3 style="margin-top: 0; margin-bottom: 1.5rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem; color: #111827;">Cadastrar Novo Usuário</h3>
        <form id="form-novo-usuario">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display:block; margin-bottom:0.25rem; font-weight: 500;">Nome Completo</label>
            <input type="text" id="nu-nome" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 4px; box-sizing: border-box;">
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display:block; margin-bottom:0.25rem; font-weight: 500;">E-mail</label>
            <input type="email" id="nu-email" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 4px; box-sizing: border-box;">
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display:block; margin-bottom:0.25rem; font-weight: 500;">Senha</label>
            <input type="password" id="nu-senha" class="form-control" required minlength="8" placeholder="Mínimo 8 caracteres" style="width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 4px; box-sizing: border-box;">
            <div style="margin-top: 0.5rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
              <span style="color: #6B7280;">Força:</span> <span id="nu-senha-label" style="font-weight: bold; width: 40px;"></span>
              <div style="flex-grow: 1; height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden;">
                <div id="nu-senha-bar" style="height: 100%; width: 0%; transition: all 0.3s; background-color: #E5E7EB;"></div>
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="display:block; margin-bottom:0.25rem; font-weight: 500;">Confirmar Senha</label>
            <input type="password" id="nu-senha2" class="form-control" required minlength="8" style="width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 4px; box-sizing: border-box;">
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight: bold;">Papéis</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: #F9FAFB; padding: 0.75rem; border-radius: 4px; border: 1px solid #E5E7EB;">
              ${UsuariosPage.renderPapeisCheckboxes('nu', [])}
            </div>
            <small style="color:#6B7280;">O papel é um atalho: marque um preset abaixo para preencher as permissões e ajuste o que precisar.</small>
          </div>

          ${UsuariosPage.renderMatriz('nu', [])}

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight: bold;">Empresas</label>
            <div id="nu-empresas-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 120px; overflow-y: auto; border: 1px solid #E5E7EB; padding: 0.75rem; border-radius: 4px; background: #F9FAFB;">
              ${UsuariosPage.renderEmpresasCheckboxes('nu-empresa', [])}
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid #E5E7EB; padding-top: 1rem;">
            <button type="button" class="btn btn-secondary" onclick="window.appController.closeModal()" style="padding: 0.5rem 1rem; border: 1px solid #D1D5DB; background: white; border-radius: 4px; cursor: pointer; font-weight: 500;">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="padding: 0.5rem 1.5rem; background-color: var(--color-primary, #DC2626); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Salvar</button>
          </div>
        </form>
      </div>
    `;

    if (window.appController) window.appController.showModal(html);

    UsuariosPage.bindMatriz('nu');

    // Marcar um papel já sugere as permissões daquele preset
    document.querySelectorAll('.nu-role').forEach(chk => {
      chk.addEventListener('change', () => {
        const papeis = Array.from(document.querySelectorAll('.nu-role:checked')).map(el => el.value);
        const sugeridas = window.Permissoes ? window.Permissoes.permissoesDosPapeis(papeis) : [];
        const conjunto = new Set(sugeridas);
        document.querySelectorAll('.nu-perm').forEach(c => { c.checked = conjunto.has(c.value); });
        if (UsuariosPage._atualizarMatriz.nu) UsuariosPage._atualizarMatriz.nu();
      });
    });

    // Senha strength
    const senhaInput = document.getElementById('nu-senha');
    const senha2Input = document.getElementById('nu-senha2');
    const sLabel = document.getElementById('nu-senha-label');
    const sBar = document.getElementById('nu-senha-bar');

    senhaInput.addEventListener('input', (e) => {
      const val = e.target.value;
      const res = UsuariosPage.validatePasswordStrength(val);
      sLabel.innerText = res.label;
      sLabel.style.color = res.color;
      sBar.style.width = val.length === 0 ? '0%' : (res.score === 0 ? '15%' : (res.score * 25) + '%');
      sBar.style.backgroundColor = res.color;
    });

    document.getElementById('form-novo-usuario').addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('nu-nome').value;
      const email = document.getElementById('nu-email').value;
      const senha = senhaInput.value;
      const senha2 = senha2Input.value;

      if (senha !== senha2) {
        if (window.appController) window.appController.showToast('As senhas não coincidem.', 'error');
        return;
      }
      if (UsuariosPage.validatePasswordStrength(senha).score < 2) {
        if (window.appController) window.appController.showToast('A senha é muito fraca. Adicione números e letras maiúsculas.', 'warning');
        return;
      }

      const papeis = Array.from(document.querySelectorAll('.nu-role:checked')).map(el => el.value);
      const empresasIds = Array.from(document.querySelectorAll('.nu-empresa:checked')).map(el => el.value);
      const permissoes = UsuariosPage.coletarPermissoes('nu');

      if (papeis.length === 0) {
        if (window.appController) window.appController.showToast('Selecione ao menos um papel.', 'warning');
        return;
      }
      if (permissoes.length === 0 && !papeis.includes('master')) {
        if (window.appController) window.appController.showToast('Marque ao menos uma permissão de módulo.', 'warning');
        return;
      }

      try {
        if (window.appController) window.appController.showLoading();
        await window.api.post('/auth/register', {
          nome, email, senha, papeis, empresasIds, permissoes
        });
        if (window.appController) {
          window.appController.showToast('Usuário cadastrado com sucesso!', 'success');
          window.appController.closeModal();
        }
        await UsuariosPage.loadUsers();
      } catch (err) {
        if (window.appController) window.appController.showToast('Erro ao cadastrar: ' + err.message, 'error');
      } finally {
        if (window.appController) window.appController.hideLoading();
      }
    });
  },

  openEditUserModal: (uid) => {
    const u = UsuariosPage.users.find(x => x.uid === uid);
    if (!u) return;

    const permissoesAtuais = UsuariosPage.permissoesEfetivas(u);

    const html = `
      <div style="padding: 1.5rem; width: 100%; max-width: 560px; box-sizing: border-box;">
        <h3 style="margin-top: 0; margin-bottom: 1.5rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem; color: #111827;">Editar Usuário</h3>
        <form id="form-edit-usuario">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display:block; margin-bottom:0.25rem; font-weight: 500;">E-mail <span style="font-size:0.8rem; color:#6B7280; font-weight:normal;">(Não pode ser alterado)</span></label>
            <input type="email" value="${u.email}" class="form-control" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 4px; background-color: #F3F4F6; color: #6B7280; box-sizing: border-box;">
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display:block; margin-bottom:0.25rem; font-weight: 500;">Nome Completo</label>
            <input type="text" id="eu-nome" class="form-control" value="${u.nome || ''}" required style="width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 4px; box-sizing: border-box;">
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight: bold;">Papéis</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: #F9FAFB; padding: 0.75rem; border-radius: 4px; border: 1px solid #E5E7EB;">
              ${UsuariosPage.renderPapeisCheckboxes('eu', u.papeis)}
            </div>
          </div>

          ${UsuariosPage.renderMatriz('eu', permissoesAtuais)}

          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight: bold;">Empresas</label>
            <div id="eu-empresas-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 120px; overflow-y: auto; border: 1px solid #E5E7EB; padding: 0.75rem; border-radius: 4px; background: #F9FAFB;">
              ${UsuariosPage.renderEmpresasCheckboxes('eu-empresa', u.empresasIds)}
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.5rem; padding: 0.75rem; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px;">
            <label style="cursor:pointer; font-weight: bold; display:flex; align-items:center; gap:0.5rem;">
              <input type="checkbox" id="eu-ativo" ${u.ativo !== false ? 'checked' : ''}> Conta Ativa
            </label>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid #E5E7EB; padding-top: 1rem;">
            <button type="button" class="btn btn-secondary" onclick="window.appController.closeModal()" style="padding: 0.5rem 1rem; border: 1px solid #D1D5DB; background: white; border-radius: 4px; cursor: pointer; font-weight: 500;">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="padding: 0.5rem 1.5rem; background-color: var(--color-primary, #DC2626); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Salvar</button>
          </div>
        </form>
      </div>
    `;

    if (window.appController) window.appController.showModal(html);

    UsuariosPage.bindMatriz('eu');

    document.getElementById('form-edit-usuario').addEventListener('submit', async (e) => {
      e.preventDefault();

      const nome = document.getElementById('eu-nome').value;
      const ativo = document.getElementById('eu-ativo').checked;
      const papeis = Array.from(document.querySelectorAll('.eu-role:checked')).map(el => el.value);
      const empresasIds = Array.from(document.querySelectorAll('.eu-empresa:checked')).map(el => el.value);
      const permissoes = UsuariosPage.coletarPermissoes('eu');

      if (papeis.length === 0) {
        if (window.appController) window.appController.showToast('Selecione ao menos um papel.', 'warning');
        return;
      }
      if (permissoes.length === 0 && !papeis.includes('master')) {
        if (window.appController) window.appController.showToast('Marque ao menos uma permissão de módulo.', 'warning');
        return;
      }

      try {
        if (window.appController) window.appController.showLoading();
        await window.api.put(`/auth/users/${uid}`, {
          nome, papeis, empresasIds, ativo, permissoes
        });
        if (window.appController) {
          window.appController.showToast('Usuário atualizado com sucesso!', 'success');
          window.appController.closeModal();
        }
        await UsuariosPage.loadUsers();
      } catch (err) {
        if (window.appController) window.appController.showToast('Erro ao atualizar: ' + err.message, 'error');
      } finally {
        if (window.appController) window.appController.hideLoading();
      }
    });
  },

  toggleUserStatus: async (uid, novoStatus) => {
    try {
      if (window.appController) window.appController.showLoading();
      await window.api.put(`/auth/users/${uid}`, { ativo: novoStatus });
      if (window.appController) window.appController.showToast(`Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`, 'success');
      await UsuariosPage.loadUsers();
    } catch (err) {
      if (window.appController) window.appController.showToast('Erro ao alterar status.', 'error');
    } finally {
      if (window.appController) window.appController.hideLoading();
    }
  }
};

window.UsuariosPage = UsuariosPage;
