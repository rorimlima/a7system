/**
 * A7SYSTEM - Dashboard de CRM (Customer Relationship Management)
 */

class CrmPage {
  constructor() {
    this.container = document.getElementById('page-content');
  }

  async render() {
    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">Dashboard CRM</h2>
        <button id="btn-refresh-crm" class="btn btn-outline">🔄 Atualizar Dados</button>
      </div>

      <div id="crm-metrics-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <!-- Métricas via JS -->
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem;">
          <h3 style="margin-top: 0; margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">🏆 Top Clientes</h3>
          <div id="crm-ranking-container">Carregando ranking...</div>
        </div>
        
        <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem;">
          <h3 style="margin-top: 0; margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">📍 Clientes por Região</h3>
          <div id="crm-regions-container">Carregando regiões...</div>
        </div>
      </div>

      <div class="card" style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; border-left: 4px solid #DC2626;">
        <h3 style="margin-top: 0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          ⚠️ Clientes Inativos (90+ dias)
        </h3>
        <div id="crm-inactive-container">Carregando clientes inativos...</div>
      </div>
    `;

    document.getElementById('btn-refresh-crm').addEventListener('click', () => this.loadData());
    
    await this.loadData();
  }

  async loadData() {
    window.appController.showLoading();
    try {
      const [metrics, topClients, regions, inactives] = await Promise.all([
        window.api.get('/crm/metricas'),
        window.api.get('/crm/clientes-ranking?limit=10'),
        window.api.get('/crm/clientes/por-regiao'),
        window.api.get('/crm/clientes/inativos?dias=90')
      ]);

      this.renderMetrics(metrics);
      this.renderRanking(topClients);
      this.renderRegions(regions);
      this.renderInactives(inactives);
    } catch (error) {
      console.error(error);
      window.appController.showToast('Erro ao carregar dados do CRM.', 'error');
    } finally {
      window.appController.hideLoading();
    }
  }

  renderMetrics(data) {
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    
    const container = document.getElementById('crm-metrics-container');
    container.innerHTML = `
      ${window.UI.createStatsCard('Total de Clientes', data.totalClientes, '👥')}
      ${window.UI.createStatsCard('Novos (30 dias)', data.novosUltimoMes, '✨')}
      ${window.UI.createStatsCard('Ticket Médio', formatCurrency(data.ticketMedio), '💰')}
      ${window.UI.createStatsCard('Taxa de Retorno', (data.taxaRetorno || 0).toFixed(1) + '%', '🔄')}
    `;
  }

  renderRanking(clients) {
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : 'N/A';

    const container = document.getElementById('crm-ranking-container');
    if (!clients || clients.length === 0) {
      container.innerHTML = '<p class="text-gray">Nenhum dado suficiente para o ranking.</p>';
      return;
    }

    const rows = clients.map((c, index) => {
      let medal = `#${index + 1}`;
      if (index === 0) medal = '🥇';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';

      return {
        id: c.clienteId,
        data: [
          medal,
          c.clienteNome,
          c.regiao || 'N/A',
          `<strong>${formatCurrency(c.totalComprado)}</strong>`,
          c.qtdCompras,
          formatDate(c.ultimaCompra),
          `<button class="btn btn-sm btn-outline btn-history" data-id="${c.clienteId}">Ver Histórico</button>`
        ]
      };
    });

    container.innerHTML = window.UI.createTable(
      ['Posição', 'Cliente', 'Região', 'Total Comprado', 'Qtd Compras', 'Última Compra', 'Ações'],
      rows
    );

    container.querySelectorAll('.btn-history').forEach(btn => {
      btn.addEventListener('click', (e) => this.showClientHistory(e.target.dataset.id));
    });
  }

  renderRegions(regions) {
    const container = document.getElementById('crm-regions-container');
    if (!regions || regions.length === 0) {
      container.innerHTML = '<p class="text-gray">Nenhum dado de região disponível.</p>';
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
    regions.forEach(r => {
      html += `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.25rem;">
            <span>${r.regiao}</span>
            <span style="font-weight: bold;">${r.quantidade} (${r.percentual.toFixed(1)}%)</span>
          </div>
          <div style="width: 100%; background: #f3f4f6; border-radius: 4px; height: 8px; overflow: hidden;">
            <div style="width: ${r.percentual}%; background: #DC2626; height: 100%;"></div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  renderInactives(clients) {
    const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : 'Nunca';
    const container = document.getElementById('crm-inactive-container');
    
    if (!clients || clients.length === 0) {
      container.innerHTML = '<p class="text-gray">Excelente! Nenhum cliente inativo há mais de 90 dias.</p>';
      return;
    }

    const rows = clients.map(c => {
      const diasInativo = c.diasInativo === 'Desconhecido' ? 'N/A' : `${c.diasInativo} dias`;
      return {
        id: c.id,
        data: [
          c.nome,
          c.telefone || 'N/A',
          c.email || 'N/A',
          formatDate(c.ultimaCompra),
          window.UI.createBadge(diasInativo, 'error'),
          `<button class="btn btn-sm btn-primary" onclick="alert('Funcionalidade de contato em desenvolvimento')">Entrar em Contato</button>`
        ]
      };
    });

    container.innerHTML = window.UI.createTable(
      ['Cliente', 'Telefone', 'E-mail', 'Última Compra', 'Inatividade', 'Ação'],
      rows
    );
  }

  async showClientHistory(clienteId) {
    window.appController.showLoading();
    try {
      const data = await window.api.get(`/crm/clientes/${clienteId}/historico`);
      const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
      const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : 'N/A';

      const modalHtml = `
        <div style="min-width: 600px;">
          <h2 style="margin-top: 0;">Histórico do Cliente</h2>
          
          <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 0.5rem 0;">${data.cliente.nome}</h3>
            <p style="margin: 0; color: #4b5563; font-size: 0.9rem;">
              <strong>Contato:</strong> ${data.cliente.telefone || 'N/A'} | ${data.cliente.email || 'N/A'} <br>
              <strong>Região:</strong> ${data.cliente.regiao || 'N/A'}
            </p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: #eff6ff; padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 0.8rem; color: #1d4ed8; font-weight: bold;">TOTAL GASTO</div>
              <div style="font-size: 1.2rem; font-weight: bold; margin-top: 0.5rem;">${formatCurrency(data.resumo.totalGasto)}</div>
            </div>
            <div style="background: #f0fdf4; padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 0.8rem; color: #15803d; font-weight: bold;">COMPRAS</div>
              <div style="font-size: 1.2rem; font-weight: bold; margin-top: 0.5rem;">${data.resumo.qtdCompras}</div>
            </div>
            <div style="background: #fdf4ff; padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 0.8rem; color: #a21caf; font-weight: bold;">TICKET MÉDIO</div>
              <div style="font-size: 1.2rem; font-weight: bold; margin-top: 0.5rem;">${formatCurrency(data.resumo.ticketMedio)}</div>
            </div>
            <div style="background: #fef2f2; padding: 1rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 0.8rem; color: #b91c1c; font-weight: bold;">ÚLTIMA COMPRA</div>
              <div style="font-size: 1.2rem; font-weight: bold; margin-top: 0.5rem;">${formatDate(data.resumo.ultimaCompra)}</div>
            </div>
          </div>

          <h3 style="margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">Timeline de Vendas</h3>
          <div style="max-height: 300px; overflow-y: auto;">
            ${data.vendas.length > 0 ? `
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${data.vendas.map(v => `
                  <li style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e5e7eb;">
                    <div>
                      <strong style="display: block;">Venda em ${formatDate(v.dataVenda)}</strong>
                      <span style="font-size: 0.8rem; color: #6b7280;">Status: ${v.status} | Itens: ${v.itens ? v.itens.length : 0}</span>
                    </div>
                    <div style="font-weight: bold;">
                      ${formatCurrency(v.valorTotal)}
                    </div>
                  </li>
                `).join('')}
              </ul>
            ` : '<p>Nenhuma venda registrada.</p>'}
          </div>

          <div style="margin-top: 1.5rem; text-align: right;">
            <button class="btn btn-secondary" onclick="window.appController.closeModal()">Fechar</button>
          </div>
        </div>
      `;
      
      window.appController.showModal(modalHtml);
    } catch (error) {
      console.error(error);
      window.appController.showToast('Erro ao carregar histórico.', 'error');
    } finally {
      window.appController.hideLoading();
    }
  }
}

window.CrmPage = new CrmPage();
