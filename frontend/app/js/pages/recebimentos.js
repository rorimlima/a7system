/**
 * A7SYSTEM - Página de Recebimentos Consolidados
 */

window.RecebimentosPage = (function() {
  const mockRecebimentos = [
    { id: 1, data: '2026-09-16', vendaId: 'A700001', cliente: 'João da Silva', forma: 'PIX', valor: 1500.00, obs: 'Sinal pago' },
    { id: 2, data: '2026-09-16', vendaId: 'A700002', cliente: 'Maria Oliveira', forma: 'Cartão', valor: 350.50, obs: '' },
    { id: 3, data: '2026-09-15', vendaId: 'A700003', cliente: 'Empresa XYZ LTDA', forma: 'Boleto', valor: 6200.00, obs: 'Parcela 1/2' },
    { id: 4, data: '2026-09-14', vendaId: 'A700003', cliente: 'Empresa XYZ LTDA', forma: 'Dinheiro', valor: 200.00, obs: 'Troco' }
  ];

  function render() {
    // Calculando totais por forma
    const totais = {};
    let totalGeral = 0;
    
    mockRecebimentos.forEach(r => {
      if (!totais[r.forma]) totais[r.forma] = 0;
      totais[r.forma] += r.valor;
      totalGeral += r.valor;
    });

    let cardsHtml = '';
    for (const [forma, valor] of Object.entries(totais)) {
      cardsHtml += \`
        <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; min-width: 150px;">
          <div style="color: #6B7280; font-size: 0.9rem; text-transform: uppercase;">\${forma}</div>
          <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color);">R$ \${valor.toFixed(2).replace('.', ',')}</div>
        </div>
      \`;
    }

    const html = \`
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">Recebimentos</h2>
      </div>

      <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
        \${cardsHtml}
        <div style="background: var(--primary-color); color: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; min-width: 150px;">
          <div style="font-size: 0.9rem; text-transform: uppercase;">TOTAL GERAL</div>
          <div style="font-size: 1.5rem; font-weight: bold;">R$ \${totalGeral.toFixed(2).replace('.', ',')}</div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <label class="form-label">Data Inicial</label>
            <input type="date" class="form-control">
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label class="form-label">Data Final</label>
            <input type="date" class="form-control">
          </div>
          <div style="flex: 2; min-width: 300px;">
            <label class="form-label">Cliente</label>
            <input type="text" class="form-control" placeholder="Nome do cliente">
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label class="form-label">Forma</label>
            <select class="form-control">
              <option value="">Todas</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="Cartão">Cartão</option>
              <option value="Boleto">Boleto</option>
            </select>
          </div>
          <div>
            <button class="btn btn-secondary">Filtrar</button>
          </div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #E5E7EB; text-align: left;">
              <th style="padding: 0.75rem;">Data</th>
              <th style="padding: 0.75rem;">Venda (Pedido)</th>
              <th style="padding: 0.75rem;">Cliente</th>
              <th style="padding: 0.75rem;">Forma</th>
              <th style="padding: 0.75rem; text-align: right;">Valor (R$)</th>
              <th style="padding: 0.75rem;">Observações</th>
            </tr>
          </thead>
          <tbody>
            \${mockRecebimentos.map(r => \`
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 0.75rem;">\${formatDate(r.data)}</td>
                <td style="padding: 0.75rem;"><a href="#/vendas" style="color: var(--primary-color); text-decoration: none; font-weight: bold;">\${r.vendaId}</a></td>
                <td style="padding: 0.75rem;">\${r.cliente}</td>
                <td style="padding: 0.75rem;">\${r.forma}</td>
                <td style="padding: 0.75rem; text-align: right; font-weight: bold;">\${r.valor.toFixed(2).replace('.', ',')}</td>
                <td style="padding: 0.75rem; color: #6B7280; font-size: 0.9rem;">\${r.obs}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>
    \`;

    window.appController.renderPage(html);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return \`\${d}/\${m}/\${y}\`;
  }

  return { render };
})();
