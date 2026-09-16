/**
 * Módulo de Gestão de Fornecedores
 */

window.FornecedoresPage = (function() {
  let fornecedores = [
    { id: 'forn_1', nome: 'Distribuidora Alpha', cnpjCpf: '11.222.333/0001-44', celular: '(11) 98888-7777', fone: '(11) 3333-4444', endereco: 'Rua A, 123 - Centro' },
    { id: 'forn_2', nome: 'Importadora Beta', cnpjCpf: '22.333.444/0001-55', celular: '(21) 97777-6666', fone: '', endereco: 'Av B, 456 - Bairro Novo' }
  ];

  function render() {
    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2>Gestão de Fornecedores</h2>
        <button class="btn btn-primary" id="btn-novo-forn">Novo Fornecedor</button>
      </div>

      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="margin-bottom: 1rem; max-width: 400px;">
          <input type="text" id="busca-forn" class="form-control" placeholder="Buscar por nome..." style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;">
        </div>

        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #E5E7EB; text-align: left;">
                <th style="padding: 12px;">Nome</th>
                <th style="padding: 12px;">CNPJ/CPF</th>
                <th style="padding: 12px;">Celular</th>
                <th style="padding: 12px;">Fone</th>
                <th style="padding: 12px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="forn-tbody">
              ${renderTableRows(fornecedores)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window.appController.renderPage(html);
    bindEvents();
  }

  function renderTableRows(data) {
    if (data.length === 0) return `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #6B7280;">Nenhum fornecedor encontrado.</td></tr>`;
    return data.map(f => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 12px; font-weight: 500;">${f.nome}</td>
        <td style="padding: 12px;">${f.cnpjCpf || '-'}</td>
        <td style="padding: 12px;">${f.celular || '-'}</td>
        <td style="padding: 12px;">${f.fone || '-'}</td>
        <td style="padding: 12px; text-align: right;">
          <button class="btn btn-outline btn-editar-forn" data-id="${f.id}" style="padding: 4px 8px; font-size: 12px;">Editar</button>
        </td>
      </tr>
    `).join('');
  }

  function bindEvents() {
    document.getElementById('btn-novo-forn').addEventListener('click', () => openModal());

    document.getElementById('busca-forn').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtrados = fornecedores.filter(f => f.nome.toLowerCase().includes(term));
      document.getElementById('forn-tbody').innerHTML = renderTableRows(filtrados);
      bindEditEvents(); // re-bind após renderizar as linhas filtradas
    });

    bindEditEvents();
  }

  function bindEditEvents() {
    document.querySelectorAll('.btn-editar-forn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const forn = fornecedores.find(x => x.id === id);
        if (forn) openModal(forn);
      });
    });
  }

  function openModal(forn = null) {
    const isEdit = !!forn;
    const html = `
      <div style="padding: 1.5rem; max-width: 500px; margin: 0 auto; background: white; border-radius: 8px;">
        <h3 style="margin-top: 0; margin-bottom: 1.5rem;">${isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
        <form id="form-forn">
          <input type="hidden" id="f-id" value="${isEdit ? forn.id : ''}">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Nome *</label>
            <input type="text" id="f-nome" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" required value="${isEdit ? forn.nome : ''}">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">CNPJ / CPF</label>
            <input type="text" id="f-cnpjcpf" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" value="${isEdit ? forn.cnpjCpf : ''}">
          </div>
          <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
            <div style="flex: 1;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Celular</label>
              <input type="text" id="f-celular" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" value="${isEdit ? forn.celular : ''}">
            </div>
            <div style="flex: 1;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Fone Fixo</label>
              <input type="text" id="f-fone" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" value="${isEdit ? forn.fone : ''}">
            </div>
          </div>
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Endereço Completo</label>
            <textarea id="f-endereco" class="form-control" rows="3" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px; resize: vertical;">${isEdit ? forn.endereco : ''}</textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-secondary" onclick="window.appController.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    `;
    window.appController.showModal(html);
    document.getElementById('form-forn').addEventListener('submit', handleSave);
  }

  async function handleSave(e) {
    e.preventDefault();
    const id = document.getElementById('f-id').value;
    const nome = document.getElementById('f-nome').value;
    const cnpjCpf = document.getElementById('f-cnpjcpf').value;
    const celular = document.getElementById('f-celular').value;
    const fone = document.getElementById('f-fone').value;
    const endereco = document.getElementById('f-endereco').value;
    
    window.appController.showLoading();
    try {
      if (id) {
        const index = fornecedores.findIndex(x => x.id === id);
        if(index !== -1) {
          fornecedores[index] = { ...fornecedores[index], nome, cnpjCpf, celular, fone, endereco };
        }
        window.appController.showToast('Fornecedor atualizado', 'success');
      } else {
        fornecedores.push({
          id: 'forn_' + Date.now(),
          nome, cnpjCpf, celular, fone, endereco
        });
        window.appController.showToast('Fornecedor criado', 'success');
      }
      window.appController.closeModal();
      render();
    } catch(err) {
      window.appController.showToast('Erro ao salvar', 'error');
    } finally {
      window.appController.hideLoading();
    }
  }

  return { render };
})();
