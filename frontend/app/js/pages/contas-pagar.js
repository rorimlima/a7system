/**
 * A7SYSTEM - Página de Contas a Pagar
 */
window.ContasPagarPage = {
  contas: [
    { id: 1, fornecedor: 'Fornecedor A', compraId: 101, total: 1500.00, pago: 500.00, emAberto: 1000.00, qtdParcelas: 3, 
      parcelas: [
        { num: 1, vencimento: '01/09/2026', valor: 500, status: 'pago', pagamentoData: '01/09/2026', forma: 'PIX' },
        { num: 2, vencimento: '01/10/2026', valor: 500, status: 'emAberto', pagamentoData: null, forma: null },
        { num: 3, vencimento: '01/11/2026', valor: 500, status: 'emAberto', pagamentoData: null, forma: null }
      ]
    },
    { id: 2, fornecedor: 'Fornecedor B', compraId: 102, total: 800.00, pago: 0, emAberto: 800.00, qtdParcelas: 1, 
      parcelas: [
        { num: 1, vencimento: '10/09/2026', valor: 800, status: 'atrasado', pagamentoData: null, forma: null }
      ]
    },
    { id: 3, fornecedor: 'Energia Elétrica', compraId: null, total: 350.00, pago: 0, emAberto: 350.00, qtdParcelas: 1, 
      parcelas: [
        { num: 1, vencimento: '20/09/2026', valor: 350, status: 'emAberto', pagamentoData: null, forma: null }
      ]
    }
  ],

  filtroAtual: 'todas', // todas, vencendo, atrasadas

  render() {
    const totalAberto = this.contas.reduce((acc, c) => acc + c.emAberto, 0);
    const totalPago = this.contas.reduce((acc, c) => acc + c.pago, 0);
    const totalAtrasado = this.contas.reduce((acc, c) => {
      let atrasado = 0;
      c.parcelas.forEach(p => {
        if(p.status === 'atrasado') atrasado += p.valor;
      });
      return acc + atrasado;
    }, 0);

    const html = `
      <div class="page-header" style="margin-bottom: 2rem;">
        <h2 style="margin: 0; margin-bottom: 1rem;">Contas a Pagar</h2>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 1rem;">
          <div class="card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #111827;">
            <div style="font-size: 0.9rem; color: #6B7280; margin-bottom: 0.5rem;">Total em Aberto</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #111827;">${this.formatCurrency(totalAberto)}</div>
          </div>
          <div class="card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #10B981;">
            <div style="font-size: 0.9rem; color: #6B7280; margin-bottom: 0.5rem;">Total Pago (Mês)</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #10B981;">${this.formatCurrency(totalPago)}</div>
          </div>
          <div class="card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #DC2626; ${totalAtrasado > 0 ? 'animation: pulse 2s infinite;' : ''}">
            <div style="font-size: 0.9rem; color: #6B7280; margin-bottom: 0.5rem;">Total Atrasado</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #DC2626;">${this.formatCurrency(totalAtrasado)}</div>
          </div>
        </div>
      </div>

      <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; margin-bottom: 2rem; overflow-x: hidden;">
        
        <!-- Abas / Filtros -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-sm ${this.filtroAtual === 'todas' ? 'btn-primary' : 'btn-outline'}" 
                  onclick="window.ContasPagarPage.filtrar('todas')">
            Todas
          </button>
          <button class="btn btn-sm ${this.filtroAtual === 'vencendo' ? 'btn-primary' : 'btn-outline'}" 
                  onclick="window.ContasPagarPage.filtrar('vencendo')">
            Vencendo Hoje / 7 Dias
          </button>
          <button class="btn btn-sm ${this.filtroAtual === 'atrasadas' ? 'btn-primary' : 'btn-outline'}" 
                  style="${this.filtroAtual === 'atrasadas' ? 'background-color: #DC2626; border-color: #DC2626;' : ''}"
                  onclick="window.ContasPagarPage.filtrar('atrasadas')">
            Atrasadas (${totalAtrasado > 0 ? this.formatCurrency(totalAtrasado) : '0'})
          </button>
        </div>

        <div class="table-responsive">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid #E5E7EB; color: #374151;">
                <th style="padding: 0.75rem;">Fornecedor</th>
                <th style="padding: 0.75rem;">Origem</th>
                <th style="padding: 0.75rem; text-align: right;">Total</th>
                <th style="padding: 0.75rem; text-align: right;">Pago</th>
                <th style="padding: 0.75rem; text-align: right;">Em Aberto</th>
                <th style="padding: 0.75rem; text-align: center;">Parcelas</th>
                <th style="padding: 0.75rem; text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${this.getContasFiltradas().map(c => `
                <tr style="border-bottom: 1px solid #E5E7EB;">
                  <td style="padding: 0.75rem; font-weight: 500;">${c.fornecedor}</td>
                  <td style="padding: 0.75rem;">
                    ${c.compraId ? `<a href="#/compras" style="color: #2563EB; text-decoration: none;">Compra #${c.compraId}</a>` : 'Avulso'}
                  </td>
                  <td style="padding: 0.75rem; text-align: right;">${this.formatCurrency(c.total)}</td>
                  <td style="padding: 0.75rem; text-align: right; color: #10B981;">${this.formatCurrency(c.pago)}</td>
                  <td style="padding: 0.75rem; text-align: right; font-weight: 500;">${this.formatCurrency(c.emAberto)}</td>
                  <td style="padding: 0.75rem; text-align: center;">${c.qtdParcelas}</td>
                  <td style="padding: 0.75rem; text-align: center;">
                    <button class="btn btn-sm btn-outline" onclick="window.ContasPagarPage.verParcelas(${c.id})">Ver Parcelas</button>
                  </td>
                </tr>
                <tr id="parcelas-row-${c.id}" style="display: none; background-color: #F9FAFB;">
                  <td colspan="7" style="padding: 1rem; border-bottom: 1px solid #E5E7EB;">
                    <div style="background: white; border: 1px solid #E5E7EB; border-radius: 4px; padding: 1rem;">
                      <h4 style="margin-top: 0; margin-bottom: 1rem; font-size: 0.9rem; color: #6B7280;">Detalhamento de Parcelas</h4>
                      <div class="table-responsive">
                        <table style="width: 100%; border-collapse: collapse;">
                          <thead>
                            <tr style="border-bottom: 1px solid #E5E7EB; font-size: 0.85rem; color: #6B7280;">
                              <th style="padding: 0.5rem; text-align: left;">Nº</th>
                              <th style="padding: 0.5rem; text-align: left;">Vencimento</th>
                              <th style="padding: 0.5rem; text-align: right;">Valor</th>
                              <th style="padding: 0.5rem; text-align: center;">Status</th>
                              <th style="padding: 0.5rem; text-align: left;">Pagamento</th>
                              <th style="padding: 0.5rem; text-align: right;">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${c.parcelas.map(p => `
                              <tr style="border-bottom: 1px solid #F3F4F6;">
                                <td style="padding: 0.5rem;">${p.num}</td>
                                <td style="padding: 0.5rem;">${p.vencimento}</td>
                                <td style="padding: 0.5rem; text-align: right; font-weight: 500;">${this.formatCurrency(p.valor)}</td>
                                <td style="padding: 0.5rem; text-align: center;">${this.getBadgeStatus(p.status)}</td>
                                <td style="padding: 0.5rem; font-size: 0.85rem;">
                                  ${p.status === 'pago' ? `<span style="color: #10B981;">${p.pagamentoData} - ${p.forma}</span>` : '-'}
                                </td>
                                <td style="padding: 0.5rem; text-align: right;">
                                  ${p.status !== 'pago' ? `
                                    <button class="btn btn-sm" style="background-color: #10B981; color: white; border: none; padding: 0.25rem 0.5rem; cursor: pointer; border-radius: 4px;" onclick="window.ContasPagarPage.abrirModalBaixa(${c.id}, ${p.num})">Baixar</button>
                                  ` : ''}
                                </td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
      </style>
    `;
    window.appController.renderPage(html);
  },

  getContasFiltradas() {
    if (this.filtroAtual === 'todas') return this.contas;
    
    return this.contas.filter(c => {
      const temParcelaStatus = c.parcelas.some(p => {
        if (this.filtroAtual === 'atrasadas') return p.status === 'atrasado';
        if (this.filtroAtual === 'vencendo') return p.status === 'emAberto'; // simplificação
        return false;
      });
      return temParcelaStatus;
    });
  },

  mudarFiltro(filtro) {
    this.filtroAtual = filtro;
    this.render();
  },

  verParcelas(contaId) {
    const row = document.getElementById(`parcelas-row-${contaId}`);
    if (row) {
      row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    }
  },

  getBadgeStatus(status) {
    if (status === 'pago') return window.UI.createBadge('Pago', 'success');
    if (status === 'emAberto') return window.UI.createBadge('A Vencer', 'warning');
    if (status === 'atrasado') return window.UI.createBadge('Atrasado', 'danger');
    return window.UI.createBadge(status, 'info');
  },

  abrirModalBaixa(contaId, parcelaNum) {
    const conta = this.contas.find(c => c.id === contaId);
    if(!conta) return;
    const parcela = conta.parcelas.find(p => p.num === parcelaNum);
    if(!parcela) return;

    const html = `
      <div style="padding: 1rem;">
        <h3 style="margin-top: 0; color: #111827; margin-bottom: 1rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem;">
          Baixar Parcela
        </h3>
        
        <div style="background-color: #F9FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
          <div style="margin-bottom: 0.5rem;"><strong>Fornecedor:</strong> ${conta.fornecedor}</div>
          <div style="margin-bottom: 0.5rem;"><strong>Parcela:</strong> ${parcela.num} de ${conta.qtdParcelas}</div>
          <div style="margin-bottom: 0.5rem;"><strong>Vencimento:</strong> ${parcela.vencimento}</div>
          <div style="font-size: 1.2rem; margin-top: 1rem;">
            <strong>Valor Original:</strong> <span style="color: #DC2626;">${this.formatCurrency(parcela.valor)}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Forma de Pagamento</label>
            <select id="baixa-forma" class="form-control" style="width: 100%;">
              <option value="PIX">PIX</option>
              <option value="Boleto">Boleto</option>
              <option value="Transferência">Transferência Bancária</option>
              <option value="Dinheiro">Dinheiro</option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Juros/Multa (R$)</label>
            <input type="number" id="baixa-juros" class="form-control" style="width: 100%;" value="0.00" step="0.01" min="0">
          </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Observações</label>
          <textarea id="baixa-obs" class="form-control" style="width: 100%; height: 80px;" placeholder="Ex: Multa por atraso de 2 dias..."></textarea>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button class="btn btn-secondary" onclick="window.appController.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="window.ContasPagarPage.confirmarBaixa(${contaId}, ${parcelaNum})" style="background-color: #10B981; border-color: #10B981;">Confirmar Baixa</button>
        </div>
      </div>
    `;
    window.appController.showModal(html);
  },

  async confirmarBaixa(contaId, parcelaNum) {
    const juros = parseFloat(document.getElementById('baixa-juros').value) || 0;
    const forma = document.getElementById('baixa-forma').value;
    
    window.appController.showLoading();
    
    // Simula API call
    await new Promise(r => setTimeout(r, 800));
    
    const conta = this.contas.find(c => c.id === contaId);
    const parcela = conta.parcelas.find(p => p.num === parcelaNum);
    
    parcela.status = 'pago';
    parcela.pagamentoData = new Date().toLocaleDateString('pt-BR');
    parcela.forma = forma;
    
    conta.pago += parcela.valor;
    conta.emAberto -= parcela.valor;

    window.appController.hideLoading();
    window.appController.closeModal();
    window.appController.showToast('Parcela baixada com sucesso!', 'success');
    
    this.render(); // re-render com estado atualizado
  },

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
};
