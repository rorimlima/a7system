/**
 * A7SYSTEM - Devoluções ao Fornecedor
 */

class DevolucoesPageManager {
  constructor() {
    this.itensDevolucao = [];
    this.devolucoes = [
      { id: '1', data: '10/09/2026', fornecedor: 'Dell Computadores', itens: 2, valor: 3000.00, motivo: 'Defeito de fábrica', retorno: 'Sim' },
      { id: '2', data: '05/09/2026', fornecedor: 'Logitech LTDA', itens: 1, valor: 150.00, motivo: 'Envio incorreto', retorno: 'Não' }
    ];
  }

  render() {
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">Devoluções ao Fornecedor</h2>
        <button class="btn btn-primary" onclick="window.DevolucoesPage.renderFormulario()" style="background-color: #DC2626; border-color: #DC2626;">Nova Devolução</button>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">Histórico de Devoluções</h3></div>
        <div style="padding: 1rem;">
          ${window.UI.createTable(
            ['Data', 'Fornecedor', 'Qtd Itens', 'Valor Total', 'Motivo', 'Retorno Financeiro', 'Ações'],
            this.devolucoes.map(d => ({
              id: d.id,
              data: [
                d.data, 
                d.fornecedor, 
                d.itens, 
                \`R$ \${d.valor.toFixed(2)}\`, 
                d.motivo, 
                d.retorno === 'Sim' ? window.UI.createBadge('Sim', 'success') : window.UI.createBadge('Não', 'secondary'),
                '<button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;">Ver</button>'
              ]
            }))
          )}
        </div>
      </div>
    `;

    window.appController.renderPage(html);
  }

  renderFormulario() {
    this.itensDevolucao = [];
    
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">Nova Devolução</h2>
        <button class="btn btn-outline" onclick="window.DevolucoesPage.render()">Voltar</button>
      </div>

      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header"><h3 class="card-title">Dados Gerais</h3></div>
        <div style="padding: 1rem; display: flex; flex-wrap: wrap; gap: 1rem;">
          <div class="form-group" style="flex: 2; min-width: 250px;">
            <label>Fornecedor</label>
            <select class="form-control" id="dev-fornecedor">
              <option value="">Selecione o Fornecedor...</option>
              <option value="1">Dell Computadores</option>
              <option value="2">Logitech LTDA</option>
            </select>
          </div>
          <div class="form-group" style="flex: 2; min-width: 200px;">
            <label>Compra Referenciada (Opcional)</label>
            <select class="form-control" id="dev-compra">
              <option value="">Nenhuma</option>
              <option value="123">Compra #123 - 10/09/2026</option>
            </select>
          </div>
          <div class="form-group" style="flex: 1; min-width: 150px;">
            <label>Data</label>
            <input type="date" class="form-control" id="dev-data" value="\${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group" style="width: 100%;">
            <label>Motivo da Devolução *</label>
            <textarea class="form-control" id="dev-motivo" rows="2" placeholder="Descreva o motivo detalhadamente..."></textarea>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header"><h3 class="card-title">Itens da Devolução</h3></div>
        <div style="padding: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: flex-end; margin-bottom: 1rem; background: #f9fafb; padding: 1rem; border-radius: 4px; border: 1px solid #e5e7eb;">
            <div class="form-group" style="flex: 2;">
              <label>Produto</label>
              <select class="form-control" id="dev-item-produto">
                <option value="">Selecione...</option>
                <option value="1" data-nome="Monitor 24 Dell" data-estoque="10" data-preco="1500.00">Monitor 24" Dell (Estoque: 10)</option>
                <option value="2" data-nome="Mouse Sem Fio" data-estoque="5" data-preco="150.00">Mouse Sem Fio (Estoque: 5)</option>
              </select>
            </div>
            <div class="form-group" style="flex: 1;">
              <label>Qtd</label>
              <input type="number" class="form-control" id="dev-item-qtd" min="1" value="1">
            </div>
            <div class="form-group" style="flex: 1;">
              <label>V. Unitário (R$)</label>
              <input type="number" class="form-control" id="dev-item-valor" min="0" step="0.01">
            </div>
            <button class="btn btn-secondary" onclick="window.DevolucoesPage.adicionarItem()">Adicionar</button>
          </div>

          <table class="table" id="tabela-dev-itens">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>V. Unit (R$)</th>
                <th>Total (R$)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colspan="5" style="text-align:center;">Nenhum item adicionado.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header"><h3 class="card-title">Retorno Financeiro</h3></div>
        <div style="padding: 1rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 500; cursor: pointer;">
            <input type="checkbox" id="dev-retorno-check" onchange="window.DevolucoesPage.toggleRetorno()">
            Esta devolução gera retorno financeiro?
          </label>
          <div id="dev-retorno-container" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 0.5rem;">O valor será creditado para abater em uma conta a pagar selecionada.</p>
            <div class="form-group">
              <label>Vincular a Conta a Pagar</label>
              <select class="form-control" id="dev-conta-pagar">
                <option value="">Selecione a conta pendente...</option>
                <option value="cp1">Fatura #999 - R$ 5.000,00</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-size: 1.25rem; font-weight: bold;">
          Total da Devolução: R$ <span id="dev-total-geral">0.00</span>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-outline" onclick="window.DevolucoesPage.render()">Cancelar</button>
          <button class="btn btn-primary" onclick="window.DevolucoesPage.salvarDevolucao()" style="background-color: #f97316; border-color: #f97316;">Confirmar Devolução</button>
        </div>
      </div>
    `;

    window.appController.renderPage(html);

    // Auto-preencher valor unitário ao selecionar produto
    document.getElementById('dev-item-produto').addEventListener('change', (e) => {
      const option = e.target.options[e.target.selectedIndex];
      if (option && option.value) {
        document.getElementById('dev-item-valor').value = option.getAttribute('data-preco');
        document.getElementById('dev-item-qtd').max = option.getAttribute('data-estoque');
      } else {
        document.getElementById('dev-item-valor').value = '';
      }
    });
  }

  adicionarItem() {
    const select = document.getElementById('dev-item-produto');
    const option = select.options[select.selectedIndex];
    const qtd = parseFloat(document.getElementById('dev-item-qtd').value);
    const valor = parseFloat(document.getElementById('dev-item-valor').value);

    if (!option.value || !qtd || isNaN(valor)) {
      window.appController.showToast('Preencha todos os campos do item.', 'error');
      return;
    }

    const estoqueMax = parseInt(option.getAttribute('data-estoque'));
    if (qtd > estoqueMax) {
      window.appController.showToast('Quantidade excede o estoque atual.', 'error');
      return;
    }

    this.itensDevolucao.push({
      produtoId: option.value,
      nome: option.getAttribute('data-nome'),
      qtd: qtd,
      valor: valor,
      total: qtd * valor
    });

    this.atualizarTabelaItens();
    
    // Limpar campos
    select.value = '';
    document.getElementById('dev-item-qtd').value = '1';
    document.getElementById('dev-item-valor').value = '';
  }

  removerItem(index) {
    this.itensDevolucao.splice(index, 1);
    this.atualizarTabelaItens();
  }

  atualizarTabelaItens() {
    const tbody = document.querySelector('#tabela-dev-itens tbody');
    let html = '';
    let totalGeral = 0;

    if (this.itensDevolucao.length === 0) {
      html = '<tr><td colspan="5" style="text-align:center;">Nenhum item adicionado.</td></tr>';
    } else {
      this.itensDevolucao.forEach((item, index) => {
        totalGeral += item.total;
        html += \`
          <tr>
            <td>\${item.nome}</td>
            <td>\${item.qtd}</td>
            <td>R$ \${item.valor.toFixed(2)}</td>
            <td>R$ \${item.total.toFixed(2)}</td>
            <td><button class="btn btn-outline" style="color:#DC2626; border-color:#DC2626; padding: 0.2rem 0.5rem;" onclick="window.DevolucoesPage.removerItem(\${index})">X</button></td>
          </tr>
        \`;
      });
    }

    tbody.innerHTML = html;
    document.getElementById('dev-total-geral').innerText = totalGeral.toFixed(2);
  }

  toggleRetorno() {
    const check = document.getElementById('dev-retorno-check');
    const container = document.getElementById('dev-retorno-container');
    container.style.display = check.checked ? 'block' : 'none';
  }

  salvarDevolucao() {
    const motivo = document.getElementById('dev-motivo').value;
    const fornecedor = document.getElementById('dev-fornecedor').value;

    if (!fornecedor) {
      window.appController.showToast('Selecione um fornecedor.', 'error');
      return;
    }
    if (!motivo) {
      window.appController.showToast('O motivo da devolução é obrigatório.', 'error');
      return;
    }
    if (this.itensDevolucao.length === 0) {
      window.appController.showToast('Adicione ao menos um item.', 'error');
      return;
    }

    window.appController.showToast('Devolução registrada com sucesso!', 'success');
    this.render();
  }
}

window.DevolucoesPage = new DevolucoesPageManager();
