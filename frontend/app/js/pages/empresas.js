/**
 * Módulo de Gestão de Empresas
 * Funcionalidades restritas para Master/Admin
 */

window.EmpresasPage = (function() {
  let empresas = [
    { id: 'emp_1', nome: 'A7SYSTEM - Matriz', cnpj: '12.345.678/0001-90', logo: '', visivelNaLanding: true, status: 'Ativo', temaPrimaria: '#DC2626', temaSecundaria: '#111827' },
    { id: 'emp_2', nome: 'A7SYSTEM - Filial 1', cnpj: '12.345.678/0002-71', logo: '', visivelNaLanding: false, status: 'Ativo', temaPrimaria: '#B91C1C', temaSecundaria: '#1F2937' }
  ];

  function render() {
    const isMaster = window.appController.hasRole('master');
    const btnNova = isMaster ? `<button class="btn btn-primary" id="btn-nova-empresa">Nova Empresa</button>` : '';
    
    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
        <h2 style="margin: 0;">Gestão de Empresas</h2>
        ${btnNova}
      </div>
      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #E5E7EB; text-align: left;">
                <th style="padding: 12px; min-width: 60px;">Logo</th>
                <th style="padding: 12px;">Nome</th>
                <th style="padding: 12px;">CNPJ</th>
                <th style="padding: 12px;">Visível (Landing)</th>
                <th style="padding: 12px;">Status</th>
                <th style="padding: 12px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${empresas.map(emp => `
                <tr style="border-bottom: 1px solid #E5E7EB;">
                  <td style="padding: 12px;">
                    ${emp.logo ? `<img src="${emp.logo}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" alt="Logo">` : `<div style="width: 40px; height: 40px; background: #F3F4F6; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #9CA3AF;">Sem Logo</div>`}
                  </td>
                  <td style="padding: 12px; font-weight: 500;">${emp.nome}</td>
                  <td style="padding: 12px;">${emp.cnpj}</td>
                  <td style="padding: 12px;">
                    <label class="toggle-switch">
                      <input type="checkbox" class="toggle-visibilidade" data-id="${emp.id}" ${emp.visivelNaLanding ? 'checked' : ''} ${!isMaster ? 'disabled' : ''}>
                      <span class="slider"></span>
                    </label>
                  </td>
                  <td style="padding: 12px;">
                    <span class="badge ${emp.status === 'Ativo' ? 'success' : 'warning'}" style="padding: 4px 8px; border-radius: 9999px; font-size: 12px; background: ${emp.status === 'Ativo' ? '#D1FAE5' : '#FEF3C7'}; color: ${emp.status === 'Ativo' ? '#065F46' : '#92400E'};">${emp.status}</span>
                  </td>
                  <td style="padding: 12px; text-align: right;">
                    <button class="btn btn-outline btn-editar" data-id="${emp.id}" style="padding: 4px 8px; font-size: 12px;">Editar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window.appController.renderPage(html);
    bindEvents();
  }

  function bindEvents() {
    const isMaster = window.appController.hasRole('master');
    
    if (isMaster) {
      const btnNova = document.getElementById('btn-nova-empresa');
      if (btnNova) btnNova.addEventListener('click', () => openModal());
    }

    document.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const emp = empresas.find(e => e.id === id);
        if (emp) openModal(emp);
      });
    });

    document.querySelectorAll('.toggle-visibilidade').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const id = e.target.getAttribute('data-id');
        const isChecked = e.target.checked;
        try {
          window.appController.showLoading();
          // window.api.patch(\`/companies/${id}/visibility\`, { visible: isChecked })
          const emp = empresas.find(e => e.id === id);
          if (emp) emp.visivelNaLanding = isChecked;
          window.appController.showToast('Visibilidade atualizada com sucesso', 'success');
        } catch (err) {
          e.target.checked = !isChecked; // revert
          window.appController.showToast('Erro ao atualizar', 'error');
        } finally {
          window.appController.hideLoading();
        }
      });
    });
  }

  function openModal(empresa = null) {
    const isEdit = !!empresa;
    const html = `
      <div style="padding: 1.5rem; max-width: 500px; margin: 0 auto; background: white; border-radius: 8px;">
        <h3 style="margin-top: 0; margin-bottom: 1.5rem;">${isEdit ? 'Editar Empresa' : 'Nova Empresa'}</h3>
        <form id="form-empresa">
          <input type="hidden" id="emp-id" value="${isEdit ? empresa.id : ''}">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Nome da Empresa *</label>
            <input type="text" id="emp-nome" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" required value="${isEdit ? empresa.nome : ''}">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">CNPJ *</label>
            <input type="text" id="emp-cnpj" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" required value="${isEdit ? empresa.cnpj : ''}">
          </div>
          
          <div style="margin-bottom: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <div style="flex: 1; min-width: min(100%, 120px);">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Cor Primária</label>
              <input type="color" id="emp-cor-pri" value="${isEdit ? empresa.temaPrimaria : '#DC2626'}" style="width: 100%; height: 40px; padding: 2px; border: 1px solid #D1D5DB; border-radius: 4px;">
            </div>
            <div style="flex: 1; min-width: min(100%, 120px);">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Cor Secundária</label>
              <input type="color" id="emp-cor-sec" value="${isEdit ? empresa.temaSecundaria : '#111827'}" style="width: 100%; height: 40px; padding: 2px; border: 1px solid #D1D5DB; border-radius: 4px;">
            </div>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 500;">
              <input type="checkbox" id="emp-visivel" ${isEdit && empresa.visivelNaLanding ? 'checked' : ''} ${!isEdit ? 'checked' : ''}>
              Visível na Landing Page
            </label>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Logo (Máx 5MB)</label>
            <input type="file" id="emp-logo" accept=".jpg,.png,.webp" style="width: 100%; padding: 8px; border: 1px dashed #D1D5DB; border-radius: 4px;">
            <div id="logo-preview" style="margin-top: 0.5rem; ${isEdit && empresa.logo ? '' : 'display:none;'}">
              <img src="${isEdit ? empresa.logo : ''}" style="max-width: 100px; max-height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #E5E7EB;">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-secondary" onclick="window.appController.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    `;
    window.appController.showModal(html);

    // Preview logo
    const fileInput = document.getElementById('emp-logo');
    const previewDiv = document.getElementById('logo-preview');
    const previewImg = previewDiv.querySelector('img');

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          window.appController.showToast('O arquivo excede o limite de 5MB.', 'error');
          fileInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          previewImg.src = ev.target.result;
          previewDiv.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        previewDiv.style.display = 'none';
      }
    });

    document.getElementById('form-empresa').addEventListener('submit', handleSave);
  }

  async function handleSave(e) {
    e.preventDefault();
    const id = document.getElementById('emp-id').value;
    const nome = document.getElementById('emp-nome').value;
    const cnpj = document.getElementById('emp-cnpj').value;
    const corPri = document.getElementById('emp-cor-pri').value;
    const corSec = document.getElementById('emp-cor-sec').value;
    const visivel = document.getElementById('emp-visivel').checked;
    
    // Na real: handle file upload via API/Firebase Storage
    // const logoFile = document.getElementById('emp-logo').files[0];
    
    window.appController.showLoading();
    try {
      if (id) {
        // UPDATE
        const index = empresas.findIndex(emp => emp.id === id);
        if(index !== -1) {
          empresas[index] = { ...empresas[index], nome, cnpj, temaPrimaria: corPri, temaSecundaria: corSec, visivelNaLanding: visivel };
        }
        window.appController.showToast('Empresa atualizada com sucesso', 'success');
      } else {
        // CREATE
        empresas.push({
          id: 'emp_' + Date.now(),
          nome,
          cnpj,
          temaPrimaria: corPri,
          temaSecundaria: corSec,
          visivelNaLanding: visivel,
          status: 'Ativo',
          logo: ''
        });
        window.appController.showToast('Empresa criada com sucesso', 'success');
      }
      window.appController.closeModal();
      render(); // refresh
    } catch(err) {
      window.appController.showToast('Erro ao salvar', 'error');
    } finally {
      window.appController.hideLoading();
    }
  }

  return { render };
})();
