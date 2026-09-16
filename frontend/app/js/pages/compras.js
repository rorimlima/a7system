/**
 * A7SYSTEM - Página de Compras
 */
window.ComprasPage = {
  compras: [
    { id: 1, data: '16/09/2026', nota: '12345', fornecedor: 'Fornecedor A', qtdItens: 10, total: 1500.00, status: 'Concluído' },
    { id: 2, data: '15/09/2026', nota: '12346', fornecedor: 'Fornecedor B', qtdItens: 5, total: 350.00, status: 'Concluído' },
    { id: 3, data: '10/09/2026', nota: '12347', fornecedor: 'Fornecedor C', qtdItens: 20, total: 4200.00, status: 'Concluído' }
  ],
  itensCompra: [],
  parcelasCompra: [],

  render() {
    this.renderList();
  },

  renderList() {
    const html = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h2 style="margin: 0;">Compras / Entradas</h2>
        <button class="btn btn-primary" onclick="window.ComprasPage.renderForm()" style="background-color: #DC2626; border-color: #DC2626;">+ Nova Compra</button>
      </div>

      <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 2rem;">
        <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
          <input type="date" id="filtro-data-inicio" class="form-control" title="Data Inicial">
          <input type="date" id="filtro-data-fim" class="form-control" title="Data Final">
          <select id="filtro-fornecedor" class="form-control">
            <option value="">Todos os Fornecedores</option>
            <option value="Fornecedor A">Fornecedor A</option>
            <option value="Fornecedor B">Fornecedor B</option>
            <option value="Fornecedor C">Fornecedor C</option>
          </select>
          <button class="btn btn-secondary">Filtrar</button>
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid #E5E7EB;">
              <th style="padding: 0.75rem;">Data</th>
              <th style="padding: 0.75rem;">Nº Nota</th>
              <th style="padding: 0.75rem;">Fornecedor</th>
              <th style="padding: 0.75rem;">Qtd Itens</th>
              <th style="padding: 0.75rem;">Valor Total</th>
              <th style="padding: 0.75rem;">Status</th>
              <th style="padding: 0.75rem;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${this.compras.map(c => `
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 0.75rem;">${c.data}</td>
                <td style="padding: 0.75rem;">${c.nota}</td>
                <td style="padding: 0.75rem;">${c.fornecedor}</td>
                <td style="padding: 0.75rem;">${c.qtdItens}</td>
                <td style="padding: 0.75rem;">${this.formatCurrency(c.total)}</td>
                <td style="padding: 0.75rem;">${window.UI ? window.UI.createBadge(c.status, 'success') : c.status}</td>
                <td style="padding: 0.75rem;">
                  <button class="btn btn-sm btn-outline" onclick="window.ComprasPage.verDetalhes(${c.id})">Ver</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    window.appController.renderPage(html);
  },

  renderForm() {
    this.itensCompra = [];
    this.parcelasCompra = [];
    
    const html = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h2 style="margin: 0;">Nova Compra</h2>
        <button class="btn btn-secondary" onclick="window.ComprasPage.renderList()">Voltar</button>
      </div>

      <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1.5rem;">
        <h3 style="margin-top: 0; margin-bottom: 1rem; color: #111827; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem;">1. Dados Gerais</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Fornecedor</label>
            <select id="compra-fornecedor" class="form-control" style="width: 100%;">
              <option value="">Selecione...</option>
              <option value="Fornecedor A">Fornecedor A</option>
              <option value="Fornecedor B">Fornecedor B</option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Data da Compra</label>
            <input type="date" id="compra-data" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Número da Nota</label>
            <input type="text" id="compra-nota" class="form-control" style="width: 100%;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Condição de Pagamento</label>
            <input type="text" id="compra-condicao" class="form-control" style="width: 100%;" placeholder="Ex: 30/60/90">
          </div>
        </div>
      </div>

      <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem; margin-bottom: 1rem;">
          <h3 style="margin: 0; color: #111827;">2. Itens da Compra</h3>
          <button class="btn btn-sm btn-primary" style="background-color: #111827; border-color: #111827;" onclick="window.ComprasPage.adicionarItem()">+ Adicionar Item</button>
        </div>
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; min-width: 800px;" id="tabela-itens">
            <thead>
              <tr style="background-color: #F9FAFB;">
                <th style="padding: 0.75rem; text-align: left;">Produto / Descrição</th>
                <th style="padding: 0.75rem; text-align: left; width: 100px;">Cód. Forn.</th>
                <th style="padding: 0.75rem; text-align: left; width: 150px;">NCM / CFOP / CST</th>
                <th style="padding: 0.75rem; text-align: right; width: 80px;">Qtd</th>
                <th style="padding: 0.75rem; text-align: right; width: 120px;">V. Unit (R$)</th>
                <th style="padding: 0.75rem; text-align: right; width: 100px;">Desc. (R$)</th>
                <th style="padding: 0.75rem; text-align: right; width: 120px;">V. Total (R$)</th>
                <th style="padding: 0.75rem; text-align: center; width: 50px;"></th>
              </tr>
            </thead>
            <tbody id="lista-itens">
              <!-- Itens injetados via JS -->
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" style="padding: 1rem; text-align: right; font-weight: bold; font-size: 1.1rem;">Subtotal Itens:</td>
                <td style="padding: 1rem; text-align: right; font-weight: bold; font-size: 1.1rem; color: #DC2626;" id="subtotal-itens">R$ 0,00</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 1.5rem;">
        <h3 style="margin-top: 0; margin-bottom: 1rem; color: #111827; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem;">3. Parcelamento</h3>
        <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: flex-end;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Nº Parcelas</label>
            <input type="number" id="parcela-qtd" class="form-control" style="width: 100px;" value="1" min="1">
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">1º Vencimento</label>
            <input type="date" id="parcela-vencimento" class="form-control">
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Intervalo (dias)</label>
            <input type="number" id="parcela-intervalo" class="form-control" style="width: 100px;" value="30">
          </div>
          <div>
            <button class="btn btn-secondary" onclick="window.ComprasPage.gerarParcelas()">Gerar Parcelas</button>
          </div>
        </div>

        <div id="preview-parcelas"></div>
      </div>

      <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 1.2rem; font-weight: 500;">Total da Compra: </span>
          <span id="total-geral" style="font-size: 1.8rem; font-weight: bold; color: #DC2626;">R$ 0,00</span>
        </div>
        <div style="display: flex; gap: 1rem;">
          <button class="btn btn-secondary" onclick="window.ComprasPage.renderList()">Cancelar</button>
          <button class="btn btn-primary" onclick="window.ComprasPage.salvarCompra()" style="background-color: #10B981; border-color: #10B981; padding: 0.75rem 2rem; font-size: 1.1rem;">Confirmar Compra</button>
        </div>
      </div>
    `;
    window.appController.renderPage(html);
    this.adicionarItem(); // Adiciona uma linha em branco por padrão
  },

  adicionarItem() {
    const itemId = Date.now() + Math.random().toString(36).substring(2, 9);
    this.itensCompra.push({
      id: itemId,
      produto: '',
      codForn: '',
      impostos: '',
      qtd: 1,
      vUnit: 0,
      desc: 0,
      total: 0
    });
    this.atualizarTabelaItens();
  },

  removerItem(id) {
    this.itensCompra = this.itensCompra.filter(i => i.id !== id);
    this.atualizarTabelaItens();
  },

  atualizarTabelaItens() {
    const tbody = document.getElementById('lista-itens');
    if(!tbody) return;
    
    tbody.innerHTML = this.itensCompra.map((item, index) => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 0.5rem;">
          <input type="text" class="form-control" style="width: 100%;" placeholder="Produto ou descrição..." value="${item.produto}" onchange="window.ComprasPage.atualizarDadosItem('${item.id}', 'produto', this.value)">
        </td>
        <td style="padding: 0.5rem;">
          <input type="text" class="form-control" style="width: 100%;" value="${item.codForn}" onchange="window.ComprasPage.atualizarDadosItem('${item.id}', 'codForn', this.value)">
        </td>
        <td style="padding: 0.5rem;">
          <input type="text" class="form-control" style="width: 100%; font-size: 0.8rem;" placeholder="NCM/CFOP/CST" value="${item.impostos}" onchange="window.ComprasPage.atualizarDadosItem('${item.id}', 'impostos', this.value)">
        </td>
        <td style="padding: 0.5rem;">
          <input type="number" class="form-control" style="width: 100%; text-align: right;" value="${item.qtd}" min="1" onchange="window.ComprasPage.atualizarCalculoItem('${item.id}', 'qtd', this.value)">
        </td>
        <td style="padding: 0.5rem;">
          <input type="number" class="form-control" style="width: 100%; text-align: right;" value="${item.vUnit}" step="0.01" min="0" onchange="window.ComprasPage.atualizarCalculoItem('${item.id}', 'vUnit', this.value)">
        </td>
        <td style="padding: 0.5rem;">
          <input type="number" class="form-control" style="width: 100%; text-align: right;" value="${item.desc}" step="0.01" min="0" onchange="window.ComprasPage.atualizarCalculoItem('${item.id}', 'desc', this.value)">
        </td>
        <td style="padding: 0.5rem; text-align: right; font-weight: 500;">
          ${this.formatCurrency(item.total)}
        </td>
        <td style="padding: 0.5rem; text-align: center;">
          <button class="btn btn-sm btn-outline" style="color: #DC2626; border-color: transparent; padding: 0.25rem 0.5rem;" onclick="window.ComprasPage.removerItem('${item.id}')">✖</button>
        </td>
      </tr>
    `).join('');

    this.calcularTotais();
  },

  atualizarDadosItem(id, campo, valor) {
    const item = this.itensCompra.find(i => i.id === id);
    if(item) {
      item[campo] = valor;
    }
  },

  atualizarCalculoItem(id, campo, valor) {
    const item = this.itensCompra.find(i => i.id === id);
    if(item) {
      item[campo] = parseFloat(valor) || 0;
      item.total = (item.qtd * item.vUnit) - item.desc;
      if (item.total < 0) item.total = 0;
      this.atualizarTabelaItens();
    }
  },

  calcularTotais() {
    const totalItens = this.itensCompra.reduce((acc, item) => acc + item.total, 0);
    const elemSubtotal = document.getElementById('subtotal-itens');
    const elemTotal = document.getElementById('total-geral');
    
    if (elemSubtotal) elemSubtotal.innerText = this.formatCurrency(totalItens);
    if (elemTotal) elemTotal.innerText = this.formatCurrency(totalItens);
    
    // Alertar parcelas se já geradas e total for diferente
    const totalParcelas = this.parcelasCompra.reduce((acc, p) => acc + p.valor, 0);
    if (this.parcelasCompra.length > 0 && Math.abs(totalParcelas - totalItens) > 0.01) {
      this.renderPreviewParcelas(true);
    } else if (this.parcelasCompra.length > 0) {
       this.renderPreviewParcelas(false);
    }
  },

  gerarParcelas() {
    const qtd = parseInt(document.getElementById('parcela-qtd').value) || 1;
    let dataInicial = document.getElementById('parcela-vencimento').value;
    const intervalo = parseInt(document.getElementById('parcela-intervalo').value) || 30;
    const totalCompra = this.itensCompra.reduce((acc, item) => acc + item.total, 0);

    if (totalCompra <= 0) {
      window.appController.showToast('O total da compra deve ser maior que zero.', 'warning');
      return;
    }

    if (!dataInicial) {
      dataInicial = new Date().toISOString().split('T')[0];
    }

    const valorParcela = totalCompra / qtd;
    this.parcelasCompra = [];

    let dataAtual = new Date(dataInicial + 'T12:00:00'); // Evita timezone offset issues
    for (let i = 1; i <= qtd; i++) {
      this.parcelasCompra.push({
        num: i,
        vencimento: dataAtual.toISOString().split('T')[0],
        valor: i === qtd ? totalCompra - (valorParcela * (qtd - 1)) : valorParcela // Ajusta centavos na última
      });
      dataAtual.setDate(dataAtual.getDate() + intervalo);
    }

    this.renderPreviewParcelas();
  },

  atualizarValorParcela(index, valor) {
    this.parcelasCompra[index].valor = parseFloat(valor) || 0;
    this.renderPreviewParcelas();
  },

  renderPreviewParcelas(showAlert = false) {
    const container = document.getElementById('preview-parcelas');
    if(!container) return;
    
    const totalCompra = this.itensCompra.reduce((acc, item) => acc + item.total, 0);
    const totalParcelas = this.parcelasCompra.reduce((acc, p) => acc + p.valor, 0);
    const isError = Math.abs(totalCompra - totalParcelas) > 0.01 || showAlert;

    let html = `
      <table style="width: 100%; max-width: 500px; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <th style="padding: 0.5rem; text-align: left;">Parcela</th>
            <th style="padding: 0.5rem; text-align: left;">Vencimento</th>
            <th style="padding: 0.5rem; text-align: right;">Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${this.parcelasCompra.map((p, idx) => `
            <tr>
              <td style="padding: 0.5rem;">${p.num}</td>
              <td style="padding: 0.5rem;">
                <input type="date" class="form-control" value="${p.vencimento}" onchange="window.ComprasPage.parcelasCompra[${idx}].vencimento = this.value">
              </td>
              <td style="padding: 0.5rem; text-align: right;">
                <input type="number" class="form-control" style="width: 120px; text-align: right;" value="${p.valor.toFixed(2)}" step="0.01" onchange="window.ComprasPage.atualizarValorParcela(${idx}, this.value)">
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    if (isError) {
      html += `
        <div style="margin-top: 1rem; padding: 0.75rem; background-color: #FEF2F2; color: #DC2626; border-radius: 4px; border: 1px solid #FCA5A5; display: inline-block;">
          ⚠️ A soma das parcelas (${this.formatCurrency(totalParcelas)}) não bate com o total da compra (${this.formatCurrency(totalCompra)}).
        </div>
      `;
    }

    container.innerHTML = html;
  },

  async salvarCompra() {
    window.appController.showLoading();
    
    // Simulação de delay API
    await new Promise(r => setTimeout(r, 1000));
    
    const totalCompra = this.itensCompra.reduce((acc, item) => acc + item.total, 0);
    const totalParcelas = this.parcelasCompra.reduce((acc, p) => acc + p.valor, 0);
    
    if (this.itensCompra.length === 0 || totalCompra <= 0) {
      window.appController.hideLoading();
      window.appController.showToast('Adicione itens com valor na compra.', 'error');
      return;
    }
    
    if (this.parcelasCompra.length > 0 && Math.abs(totalCompra - totalParcelas) > 0.01) {
       window.appController.hideLoading();
       window.appController.showToast('A soma das parcelas está diferente do total.', 'error');
       return;
    }
    
    window.appController.hideLoading();
    window.appController.showToast('Compra registrada com sucesso!', 'success');
    this.renderList();
  },

  verDetalhes(id) {
    const compra = this.compras.find(c => c.id === id);
    if(!compra) return;

    const html = `
      <div style="padding: 1rem;">
        <h3 style="margin-top: 0; color: #111827; margin-bottom: 1.5rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem;">
          Detalhes da Compra #${id}
        </h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div><strong>Fornecedor:</strong> ${compra.fornecedor}</div>
          <div><strong>Data:</strong> ${compra.data}</div>
          <div><strong>Nº Nota:</strong> ${compra.nota}</div>
          <div><strong>Status:</strong> ${window.UI ? window.UI.createBadge(compra.status, 'success') : compra.status}</div>
        </div>

        <h4 style="margin-bottom: 0.5rem;">Itens (Resumo)</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
          <tr style="background: #F9FAFB;"><th style="padding: 0.5rem; text-align: left;">Qtd</th><th style="padding: 0.5rem; text-align: left;">Produto</th><th style="padding: 0.5rem; text-align: right;">Total</th></tr>
          <tr><td style="padding: 0.5rem;">${compra.qtdItens}</td><td style="padding: 0.5rem;">Itens Diversos</td><td style="padding: 0.5rem; text-align: right;">${this.formatCurrency(compra.total)}</td></tr>
        </table>
        
        <h4 style="margin-bottom: 0.5rem;">Parcelas</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
          <tr style="background: #F9FAFB;"><th style="padding: 0.5rem; text-align: left;">Vencimento</th><th style="padding: 0.5rem; text-align: right;">Valor</th><th style="padding: 0.5rem; text-align: center;">Status</th></tr>
          <tr><td style="padding: 0.5rem;">${compra.data}</td><td style="padding: 0.5rem; text-align: right;">${this.formatCurrency(compra.total)}</td><td style="padding: 0.5rem; text-align: center;">${window.UI ? window.UI.createBadge('Pago', 'success') : 'Pago'}</td></tr>
        </table>
        
        <div style="text-align: right;">
          <button class="btn btn-secondary" onclick="window.appController.closeModal()">Fechar</button>
        </div>
      </div>
    `;
    window.appController.showModal(html);
  },

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
};
