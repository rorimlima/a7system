/**
 * Módulo de Gestão de Clientes
 */

window.ClientesPage = (function() {
  let clientes = [
    { id: 'cli_1', nome: 'João da Silva', cpfCnpj: '12345678901', cidade: 'São Paulo', bairro: 'Centro', regiao: 'Sul', enderecoCompleto: 'Rua das Flores, 123', contatos: 'joao@email.com / 1199999999' },
    { id: 'cli_2', nome: 'Maria Oliveira', cpfCnpj: '98765432100', cidade: 'Rio de Janeiro', bairro: 'Copacabana', regiao: 'Leste', enderecoCompleto: 'Av Atlantica, 400', contatos: 'maria@email.com / 2198888888' }
  ];

  function render() {
    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
        <h2 style="margin: 0;">Gestão de Clientes</h2>
        <button class="btn btn-primary" id="btn-novo-cli">Novo Cliente</button>
      </div>

      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="margin-bottom: 1rem; max-width: 400px;">
          <input type="text" id="busca-cli" class="form-control" placeholder="Buscar por nome ou CPF/CNPJ..." style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;">
        </div>

        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #E5E7EB; text-align: left;">
                <th style="padding: 12px;">Nome</th>
                <th style="padding: 12px;">CPF/CNPJ</th>
                <th style="padding: 12px;">Cidade</th>
                <th style="padding: 12px;">Bairro</th>
                <th style="padding: 12px;">Região</th>
                <th style="padding: 12px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="cli-tbody">
              ${renderTableRows(clientes)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window.appController.renderPage(html);
    bindEvents();
  }

  function renderTableRows(data) {
    if (data.length === 0) return `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #6B7280;">Nenhum cliente encontrado.</td></tr>`;
    return data.map(c => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 12px; font-weight: 500;">${c.nome}</td>
        <td style="padding: 12px;">${c.cpfCnpj}</td>
        <td style="padding: 12px;">${c.cidade || '-'}</td>
        <td style="padding: 12px;">${c.bairro || '-'}</td>
        <td style="padding: 12px;">${c.regiao || '-'}</td>
        <td style="padding: 12px; text-align: right;">
          <button class="btn btn-outline btn-editar-cli" data-id="${c.id}" style="padding: 4px 8px; font-size: 12px;">Editar</button>
        </td>
      </tr>
    `).join('');
  }

  function bindEvents() {
    document.getElementById('btn-novo-cli').addEventListener('click', () => openModal());

    document.getElementById('busca-cli').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtrados = clientes.filter(c => 
        c.nome.toLowerCase().includes(term) || 
        c.cpfCnpj.toLowerCase().includes(term)
      );
      document.getElementById('cli-tbody').innerHTML = renderTableRows(filtrados);
      bindEditEvents();
    });

    bindEditEvents();
  }

  function bindEditEvents() {
    document.querySelectorAll('.btn-editar-cli').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const cli = clientes.find(x => x.id === id);
        if (cli) openModal(cli);
      });
    });
  }

  function openModal(cli = null) {
    const isEdit = !!cli;
    const html = `
      <div style="padding: 1.5rem; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px;">
        <h3 style="margin-top: 0; margin-bottom: 1.5rem;">${isEdit ? 'Editar Cliente' : 'Novo Cliente'}</h3>
        <form id="form-cli">
          <input type="hidden" id="c-id" value="${isEdit ? cli.id : ''}">
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Nome *</label>
              <input type="text" id="c-nome" class="form-control" style="width: 100%;" required value="${isEdit ? cli.nome : ''}">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">CPF / CNPJ *</label>
              <input type="text" id="c-cpfcnpj" class="form-control" style="width: 100%;" required value="${isEdit ? cli.cpfCnpj : ''}">
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Endereço Completo *</label>
            <input type="text" id="c-endereco" class="form-control" style="width: 100%;" required value="${isEdit ? cli.enderecoCompleto : ''}">
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Cidade</label>
              <input type="text" id="c-cidade" class="form-control" style="width: 100%;" value="${isEdit ? cli.cidade : ''}">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Bairro</label>
              <input type="text" id="c-bairro" class="form-control" style="width: 100%;" value="${isEdit ? cli.bairro : ''}">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Região</label>
              <input type="text" id="c-regiao" class="form-control" style="width: 100%;" value="${isEdit ? cli.regiao : ''}">
            </div>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Contatos (Telefone/Email)</label>
            <textarea id="c-contatos" class="form-control" rows="2" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px; resize: vertical;">${isEdit ? cli.contatos : ''}</textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-secondary" onclick="window.appController.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    `;
    window.appController.showModal(html);
    document.getElementById('form-cli').addEventListener('submit', handleSave);
  }

  function validaCpfCnpj(val) {
    const digits = val.replace(/\D/g, '');
    return digits.length === 11 || digits.length === 14;
  }

  async function handleSave(e) {
    e.preventDefault();
    const id = document.getElementById('c-id').value;
    const nome = document.getElementById('c-nome').value;
    const cpfCnpj = document.getElementById('c-cpfcnpj').value;
    const enderecoCompleto = document.getElementById('c-endereco').value;
    const cidade = document.getElementById('c-cidade').value;
    const bairro = document.getElementById('c-bairro').value;
    const regiao = document.getElementById('c-regiao').value;
    const contatos = document.getElementById('c-contatos').value;
    
    if (!validaCpfCnpj(cpfCnpj)) {
      window.appController.showToast('CPF/CNPJ inválido. Digite 11 ou 14 dígitos.', 'error');
      return;
    }

    window.appController.showLoading();
    try {
      if (id) {
        const index = clientes.findIndex(x => x.id === id);
        if(index !== -1) {
          clientes[index] = { ...clientes[index], nome, cpfCnpj, enderecoCompleto, cidade, bairro, regiao, contatos };
        }
        window.appController.showToast('Cliente atualizado', 'success');
      } else {
        clientes.push({
          id: 'cli_' + Date.now(),
          nome, cpfCnpj, enderecoCompleto, cidade, bairro, regiao, contatos
        });
        window.appController.showToast('Cliente criado', 'success');
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
