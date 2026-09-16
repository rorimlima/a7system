/**
 * A7SYSTEM - Página de Gestão de Usuários
 */
const UsuariosPage = {
  users: [],
  
  render: async () => {
    if (!window.appController || (!window.appController.hasRole('master') && !window.appController.hasRole('adm'))) {
      if (window.appController) {
        window.appController.showToast('Sem permissão para acessar esta página.', 'error');
        window.appController.navigate('/dashboard');
      }
      return;
    }

    const contentArea = document.getElementById('page-content');
    
    let btnNovoHTML = '';
    if (window.appController.hasRole('master')) {
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

    if (window.appController.hasRole('master')) {
      document.getElementById('btn-novo-usuario').addEventListener('click', UsuariosPage.openNewUserModal);
    }
    
    document.getElementById('busca-usuario').addEventListener('input', (e) => {
      UsuariosPage.renderTable(e.target.value);
    });

    await UsuariosPage.loadUsers();
  },

  loadUsers: async () => {
    try {
      if (window.appController) window.appController.showLoading();
      
      let res;
      try {
        res = await window.api.get('/auth/users');
        UsuariosPage.users = res.data || [];
      } catch(e) {
        console.warn("Usando mock data para usuários. Endpoint da API pode não estar pronto.");
        UsuariosPage.users = [
          { uid: 'u1', nome: 'Administrador Master', email: 'admin@a7system.com', papeis: ['master'], empresasIds: ['emp_1'], ativo: true },
          { uid: 'u2', nome: 'João Vendedor', email: 'joao@a7system.com', papeis: ['vendedor'], empresasIds: ['emp_1'], ativo: true },
          { uid: 'u3', nome: 'Maria Estoque', email: 'maria@a7system.com', papeis: ['estoque'], empresasIds: ['emp_1', 'emp_2'], ativo: false }
        ];
      }
      
      UsuariosPage.renderTable();
    } catch (err) {
      if (window.appController) window.appController.showToast('Erro ao carregar usuários.', 'error');
    } finally {
      if (window.appController) window.appController.hideLoading();
    }
  },

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

    const headers = ['Nome', 'E-mail', 'Papéis', 'Status', 'Ações'];
    
    const rows = filtered.map(u => {
      const papeisBadges = u.papeis ? u.papeis.map(p => {
        let color = 'secondary';
        if (p === 'master') color = 'danger';
        if (p === 'adm') color = 'primary';
        if (p === 'vendedor') color = 'success';
        if (p === 'estoque') color = 'warning';
        return window.UI ? window.UI.createBadge(p.toUpperCase(), color) : p;
      }).join(' ') : '-';
      
      const statusBadge = u.ativo !== false 
        ? (window.UI ? window.UI.createBadge('Ativo', 'success') : 'Ativo')
        : (window.UI ? window.UI.createBadge('Inativo', 'danger') : 'Inativo');

      let acoes = '';
      if (window.appController && window.appController.hasRole('master')) {
        acoes = `
          <button class="btn btn-sm" style="background-color: #3B82F6; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; margin-right: 0.25rem;" onclick="UsuariosPage.openEditUserModal('${u.uid}')">Editar</button>
          <button class="btn btn-sm" style="background-color: ${u.ativo !== false ? '#EF4444' : '#10B981'}; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;" onclick="UsuariosPage.toggleUserStatus('${u.uid}', ${u.ativo !== false ? 'false' : 'true'})">${u.ativo !== false ? 'Desativar' : 'Ativar'}</button>
        `;
      } else {
        acoes = '-';
      }

      return {
        id: u.uid,
        data: [
          u.nome || '-',
          u.email,
          papeisBadges,
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

  openNewUserModal: () => {
    const html = `
      <div style="padding: 1.5rem; width: 100%; min-width: 400px; max-width: 500px; box-sizing: border-box;">
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
              <label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="nu-role" value="master"> Master</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="nu-role" value="adm"> Adm</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="nu-role" value="vendedor"> Vendedor</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="nu-role" value="estoque"> Estoque</label>
            </div>
          </div>
          
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight: bold;">Empresas</label>
            <div id="nu-empresas-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 120px; overflow-y: auto; border: 1px solid #E5E7EB; padding: 0.75rem; border-radius: 4px; background: #F9FAFB;">
              Carregando...
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

    // Carregar empresas no form
    const empList = document.getElementById('nu-empresas-list');
    const mainSelect = document.getElementById('empresa-selector');
    let empHtml = '';
    if (mainSelect && mainSelect.options.length > 0) {
      Array.from(mainSelect.options).forEach(opt => {
        if(opt.value) {
          empHtml += `<label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="nu-empresa" value="${opt.value}"> ${opt.text}</label>`;
        }
      });
    }
    if (!empHtml) empHtml = '<span style="color:#6B7280;">Nenhuma empresa disponível.</span>';
    empList.innerHTML = empHtml;

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

      if (papeis.length === 0) {
        if (window.appController) window.appController.showToast('Selecione ao menos um papel.', 'warning');
        return;
      }

      try {
        if (window.appController) window.appController.showLoading();
        await window.api.post('/auth/register', {
          nome, email, password: senha, papeis, empresasIds
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

    const html = `
      <div style="padding: 1.5rem; width: 100%; min-width: 400px; max-width: 500px; box-sizing: border-box;">
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
              <label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="eu-role" value="master" ${u.papeis?.includes('master') ? 'checked' : ''}> Master</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="eu-role" value="adm" ${u.papeis?.includes('adm') ? 'checked' : ''}> Adm</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="eu-role" value="vendedor" ${u.papeis?.includes('vendedor') ? 'checked' : ''}> Vendedor</label>
              <label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="eu-role" value="estoque" ${u.papeis?.includes('estoque') ? 'checked' : ''}> Estoque</label>
            </div>
          </div>
          
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight: bold;">Empresas</label>
            <div id="eu-empresas-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 120px; overflow-y: auto; border: 1px solid #E5E7EB; padding: 0.75rem; border-radius: 4px; background: #F9FAFB;">
              Carregando...
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

    // Carregar empresas
    const empList = document.getElementById('eu-empresas-list');
    const mainSelect = document.getElementById('empresa-selector');
    let empHtml = '';
    if (mainSelect && mainSelect.options.length > 0) {
      Array.from(mainSelect.options).forEach(opt => {
        if(opt.value) {
          const checked = u.empresasIds?.includes(opt.value) ? 'checked' : '';
          empHtml += `<label style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;"><input type="checkbox" class="eu-empresa" value="${opt.value}" ${checked}> ${opt.text}</label>`;
        }
      });
    }
    if (!empHtml) empHtml = '<span style="color:#6B7280;">Nenhuma empresa disponível.</span>';
    empList.innerHTML = empHtml;

    document.getElementById('form-edit-usuario').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const nome = document.getElementById('eu-nome').value;
      const ativo = document.getElementById('eu-ativo').checked;
      const papeis = Array.from(document.querySelectorAll('.eu-role:checked')).map(el => el.value);
      const empresasIds = Array.from(document.querySelectorAll('.eu-empresa:checked')).map(el => el.value);

      if (papeis.length === 0) {
        if (window.appController) window.appController.showToast('Selecione ao menos um papel.', 'warning');
        return;
      }

      try {
        if (window.appController) window.appController.showLoading();
        await window.api.put(`/auth/users/${uid}`, {
          nome, papeis, empresasIds, ativo
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
