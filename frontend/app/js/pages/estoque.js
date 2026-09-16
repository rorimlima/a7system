/**
 * A7SYSTEM - Dashboard de Estoque
 */

class EstoquePageManager {
  constructor() {
    this.produtosAlerta = [
      { id: '1', codigo: 'PRD-001', descricao: 'Monitor 24" Dell', qtdAtual: 2, qtdMinima: 5 },
      { id: '2', codigo: 'PRD-002', descricao: 'Teclado Mecânico', qtdAtual: 0, qtdMinima: 10 }
    ];

    this.movimentacoes = [
      { id: '1', data: '16/09/2026 10:30', produto: 'Monitor 24" Dell', tipo: 'entrada', qtd: 10, origem: 'Compra #123', usuario: 'João', obs: '' },
      { id: '2', data: '15/09/2026 14:15', produto: 'Teclado Mecânico', tipo: 'saida', qtd: 2, origem: 'Venda #45', usuario: 'Maria', obs: '' },
      { id: '3', data: '14/09/2026 09:00', produto: 'Mouse Sem Fio', tipo: 'ajuste', qtd: -1, origem: 'Manual', usuario: 'João', obs: 'Perda' },
      { id: '4', data: '12/09/2026 16:45', produto: 'Monitor 24" Dell', tipo: 'devolucao', qtd: 1, origem: 'Fornecedor XYZ', usuario: 'João', obs: 'Defeito' },
      { id: '5', data: '10/09/2026 11:20', produto: 'Cabo HDMI', tipo: 'entrada', qtd: 50, origem: 'Compra #120', usuario: 'Maria', obs: '' }
    ];
  }

  render() {
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">Dashboard de Estoque</h2>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        ${window.UI.createStatsCard('Total de Produtos', '156', '📦', 'Cadastrados no sistema')}
        ${window.UI.createStatsCard('Produtos em Estoque Crítico', this.produtosAlerta.length.toString(), '⚠️', 'Abaixo do mínimo exigido')}
        ${window.UI.createStatsCard('Última Movimentação', '16/09/2026', '⏱️', 'Entrada - Compra #123')}
      </div>

      <div class="card" style="margin-bottom: 2rem; border-left: 4px solid #DC2626;">
        <div class="card-header"><h3 class="card-title">Alertas de Estoque Mínimo</h3></div>
        <div style="padding: 1rem;">
          ${this.renderAlertas()}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">Histórico de Movimentações</h3></div>
        
        <div style="padding: 1rem; display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
          <div class="form-group" style="flex: 1; min-width: 200px;">
            <label>Produto</label>
            <input type="text" id="filtro-produto" class="form-control" placeholder="Buscar por nome ou código">
          </div>
          <div class="form-group" style="width: 200px;">
            <label>Tipo</label>
            <select id="filtro-tipo" class="form-control">
              <option value="">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
              <option value="devolucao">Devoluções</option>
              <option value="ajuste">Ajustes</option>
            </select>
          </div>
          <div class="form-group" style="width: 150px;">
            <label>Data</label>
            <input type="date" id="filtro-data" class="form-control">
          </div>
          <button class="btn btn-primary" onclick="window.EstoquePage.filtrar()" style="margin-bottom: 1rem;">Filtrar</button>
        </div>

        <div id="tabela-movimentacoes-container">
          ${this.renderTabela()}
        </div>
      </div>
    `;

    window.appController.renderPage(html);
    
    // Colorir card de estoque crítico se > 0
    if (this.produtosAlerta.length > 0) {
      const cards = document.querySelectorAll('.card');
      cards[1].style.border = '1px solid #DC2626';
      cards[1].style.backgroundColor = '#FEF2F2';
    }
  }

  renderAlertas() {
    if (this.produtosAlerta.length === 0) {
      return '<p>Nenhum produto em estoque crítico.</p>';
    }

    let html = '<table class="table" style="width: 100%;">';
    html += '<thead><tr><th>Código</th><th>Descrição</th><th>Qtd Atual</th><th>Qtd Mínima</th><th>Ações</th></tr></thead><tbody>';
    
    this.produtosAlerta.forEach(prod => {
      const bg = prod.qtdAtual === 0 ? '#FEF2F2' : '#FFFBEB';
      const color = prod.qtdAtual === 0 ? '#DC2626' : '#B45309';
      
      html += `<tr style="background-color: ${bg};">
        <td>${prod.codigo}</td>
        <td>${prod.descricao}</td>
        <td style="color: ${color}; font-weight: bold;">${prod.qtdAtual}</td>
        <td>${prod.qtdMinima}</td>
        <td><a href="#/compras" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Comprar</a></td>
      </tr>`;
    });

    html += '</tbody></table>';
    return html;
  }

  renderTabela() {
    return window.UI.createTable(
      ['Data', 'Produto', 'Tipo', 'Qtd', 'Origem', 'Usuário', 'Obs'],
      this.movimentacoes.map(m => {
        let badgeColor = 'secondary';
        let tipoNome = m.tipo;
        
        switch(m.tipo) {
          case 'entrada': badgeColor = 'success'; tipoNome = 'Entrada'; break;
          case 'saida': badgeColor = 'danger'; tipoNome = 'Saída'; break;
          case 'devolucao': badgeColor = 'warning'; tipoNome = 'Devolução'; break;
          case 'ajuste': badgeColor = 'info'; tipoNome = 'Ajuste'; break;
        }

        return {
          id: m.id,
          data: [
            m.data,
            m.produto,
            window.UI.createBadge(tipoNome, badgeColor),
            m.tipo === 'saida' || (m.tipo === 'ajuste' && m.qtd < 0) ? `<span style="color: #DC2626">${m.qtd}</span>` : `<span style="color: #059669">+${m.qtd}</span>`,
            m.origem,
            m.usuario,
            m.obs
          ]
        };
      })
    );
  }

  filtrar() {
    window.appController.showToast('Filtro aplicado (Mock)', 'info');
  }
}

window.EstoquePage = new EstoquePageManager();
