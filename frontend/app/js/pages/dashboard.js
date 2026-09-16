/**
 * A7SYSTEM - Dashboard Financeiro (Fase 7)
 */

const DashboardPage = {
  render: async function() {
    window.appController.renderPage(`
      <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h2 style="margin: 0; color: #111827;">Dashboard Financeiro</h2>
        
        <div class="dashboard-filters" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <input type="date" id="dash-data-inicial" class="form-control" style="width: auto;">
          <span style="align-self: center;">até</span>
          <input type="date" id="dash-data-final" class="form-control" style="width: auto;">
          <button id="btn-dash-filtrar" class="btn btn-primary" style="background-color: #DC2626; border-color: #DC2626; color: white;">Filtrar</button>
          <button id="btn-dash-exportar" class="btn btn-secondary" style="background-color: #111827; border-color: #111827; color: white;">Exportar PDF</button>
        </div>
      </div>

      <!-- Loading do Dashboard -->
      <div id="dash-loading" style="text-align: center; padding: 2rem; display: none;">
        <div class="spinner" style="border-top-color: #DC2626;"></div>
        <p>Carregando dados...</p>
      </div>

      <div id="dash-content">
        <!-- Linha 1: KPIs Principais -->
        <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #10B981; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="color: #6B7280; font-size: 0.9rem; margin-bottom: 0.5rem;">Vendas do Período</div>
            <div id="kpi-vendas" style="font-size: 1.5rem; font-weight: bold; color: #10B981;">R$ 0,00</div>
            <div id="kpi-qtd-vendas" style="color: #9CA3AF; font-size: 0.8rem; margin-top: 0.5rem;">0 vendas</div>
          </div>
          
          <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #3B82F6; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="color: #6B7280; font-size: 0.9rem; margin-bottom: 0.5rem;">Compras do Período</div>
            <div id="kpi-compras" style="font-size: 1.5rem; font-weight: bold; color: #3B82F6;">R$ 0,00</div>
            <div id="kpi-qtd-compras" style="color: #9CA3AF; font-size: 0.8rem; margin-top: 0.5rem;">0 compras</div>
          </div>
          
          <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #6B7280; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" id="card-saldo">
            <div style="color: #6B7280; font-size: 0.9rem; margin-bottom: 0.5rem;">Saldo (Vendas - Compras)</div>
            <div id="kpi-saldo" style="font-size: 1.5rem; font-weight: bold;">R$ 0,00</div>
          </div>
          
          <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #6B7280; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" id="card-lucro">
            <div style="color: #6B7280; font-size: 0.9rem; margin-bottom: 0.5rem;">Lucro Estimado</div>
            <div id="kpi-lucro" style="font-size: 1.5rem; font-weight: bold;">R$ 0,00</div>
          </div>
        </div>

        <!-- Linha 2: KPIs Secundários -->
        <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="color: #6B7280; font-size: 0.9rem; margin-bottom: 0.5rem;">Contas em Aberto</div>
            <div id="kpi-contas-aberto" style="font-size: 1.25rem; font-weight: 500;">R$ 0,00</div>
          </div>
          
          <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" id="card-contas-atrasadas">
            <div style="color: #6B7280; font-size: 0.9rem; margin-bottom: 0.5rem;">Contas Atrasadas</div>
            <div id="kpi-contas-atrasadas" style="font-size: 1.25rem; font-weight: 500;">R$ 0,00</div>
          </div>
          
          <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" id="card-estoque-critico">
            <div style="color: #6B7280; font-size: 0.9rem; margin-bottom: 0.5rem;">Estoque Crítico</div>
            <div id="kpi-estoque-critico" style="font-size: 1.25rem; font-weight: 500;">0 produtos</div>
          </div>
        </div>

        <!-- Linha 3 e 4: Gráficos -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          
          <!-- Vendas Diárias -->
          <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #111827; font-size: 1.1rem; margin-bottom: 1rem;">Vendas Diárias</h3>
            <div class="chart-container" style="height: 200px; display: flex; align-items: flex-end; gap: 4px; padding-bottom: 20px; position: relative; border-bottom: 1px solid #E5E7EB;">
              <div id="chart-vendas-diarias" style="display: flex; width: 100%; height: 100%; align-items: flex-end; gap: 4px; justify-content: space-around;">
                <!-- Barras injetadas via JS -->
              </div>
            </div>
          </div>
          
          <!-- Fluxo de Caixa -->
          <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #111827; font-size: 1.1rem; margin-bottom: 1rem;">Fluxo de Caixa (Últimos 6 meses)</h3>
            <div class="chart-container" style="height: 200px; display: flex; align-items: flex-end; padding-bottom: 20px; position: relative; border-bottom: 1px solid #E5E7EB;">
              <div id="chart-fluxo-caixa" style="display: flex; width: 100%; height: 100%; align-items: flex-end; justify-content: space-around;">
                <!-- Barras duplas injetadas via JS -->
              </div>
            </div>
            <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; font-size: 0.8rem;">
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; background: #10B981; display: inline-block;"></span> Entradas</span>
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; background: #DC2626; display: inline-block;"></span> Saídas</span>
            </div>
          </div>
        </div>

        <!-- Linha 5: Top Produtos -->
        <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0; color: #111827; font-size: 1.1rem; margin-bottom: 1rem;">Top 10 Produtos Mais Vendidos</h3>
          <div class="table-responsive">
            <table class="table" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #E5E7EB; text-align: left;">
                  <th style="padding: 0.75rem;">Posição</th>
                  <th style="padding: 0.75rem;">Produto</th>
                  <th style="padding: 0.75rem; text-align: center;">Qtd Vendida</th>
                  <th style="padding: 0.75rem; text-align: right;">Valor Total</th>
                  <th style="padding: 0.75rem; width: 30%;">Proporção</th>
                </tr>
              </thead>
              <tbody id="tbody-top-produtos">
                <!-- Injetado via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `);

    // Set default dates (1st day of current month to today)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('dash-data-inicial').value = firstDay.toISOString().split('T')[0];
    document.getElementById('dash-data-final').value = today.toISOString().split('T')[0];

    // Events
    document.getElementById('btn-dash-filtrar').addEventListener('click', () => this.loadDashboardData());
    document.getElementById('btn-dash-exportar').addEventListener('click', () => this.exportPdf());

    // Load initial data
    this.loadDashboardData();
  },

  loadDashboardData: async function() {
    const dataInicial = document.getElementById('dash-data-inicial').value;
    const dataFinal = document.getElementById('dash-data-final').value;
    const empresaId = window.appController.empresaAtiva;

    document.getElementById('dash-content').style.display = 'none';
    document.getElementById('dash-loading').style.display = 'block';

    try {
      // Carregar KPIs
      const kpis = await window.api.get('/dashboard/kpis', { empresaId, dataInicial, dataFinal });
      this.renderKpis(kpis);

      // Carregar Vendas Diárias
      const vendasDiarias = await window.api.get('/dashboard/vendas-por-dia', { empresaId, dataInicial, dataFinal });
      this.renderVendasDiarias(vendasDiarias);

      // Carregar Top Produtos
      const topProdutos = await window.api.get('/dashboard/top-produtos', { empresaId, limit: 10 });
      this.renderTopProdutos(topProdutos);

      // Carregar Fluxo de Caixa
      const fluxoCaixa = await window.api.get('/dashboard/fluxo-caixa', { empresaId, meses: 6 });
      this.renderFluxoCaixa(fluxoCaixa);

    } catch (error) {
      window.appController.showToast('Erro ao carregar dashboard: ' + error.message, 'error');
    } finally {
      document.getElementById('dash-loading').style.display = 'none';
      document.getElementById('dash-content').style.display = 'block';
    }
  },

  renderKpis: function(kpis) {
    const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    
    document.getElementById('kpi-vendas').innerText = formatBRL(kpis.total_vendas);
    document.getElementById('kpi-qtd-vendas').innerText = \`\${kpis.qtd_vendas} vendas\`;
    
    document.getElementById('kpi-compras').innerText = formatBRL(kpis.total_compras);
    document.getElementById('kpi-qtd-compras').innerText = \`\${kpis.qtd_compras} compras\`;
    
    const saldoEl = document.getElementById('kpi-saldo');
    saldoEl.innerText = formatBRL(kpis.saldo);
    document.getElementById('card-saldo').style.borderLeftColor = kpis.saldo >= 0 ? '#10B981' : '#DC2626';
    saldoEl.style.color = kpis.saldo >= 0 ? '#10B981' : '#DC2626';

    const lucroEl = document.getElementById('kpi-lucro');
    lucroEl.innerText = formatBRL(kpis.lucro_estimado);
    document.getElementById('card-lucro').style.borderLeftColor = kpis.lucro_estimado >= 0 ? '#10B981' : '#DC2626';
    lucroEl.style.color = kpis.lucro_estimado >= 0 ? '#10B981' : '#DC2626';

    document.getElementById('kpi-contas-aberto').innerText = formatBRL(kpis.contas_pagar_aberto);
    
    const atrasadasEl = document.getElementById('kpi-contas-atrasadas');
    atrasadasEl.innerText = formatBRL(kpis.contas_pagar_atrasadas);
    if (kpis.contas_pagar_atrasadas > 0) {
      atrasadasEl.style.color = '#DC2626';
      document.getElementById('card-contas-atrasadas').style.borderLeftColor = '#DC2626';
    } else {
      atrasadasEl.style.color = '#111827';
      document.getElementById('card-contas-atrasadas').style.borderLeftColor = '#E5E7EB';
    }

    const estoqueEl = document.getElementById('kpi-estoque-critico');
    estoqueEl.innerText = \`\${kpis.produtos_estoque_critico} produtos\`;
    if (kpis.produtos_estoque_critico > 0) {
      estoqueEl.style.color = '#DC2626';
      document.getElementById('card-estoque-critico').style.borderLeftColor = '#DC2626';
    } else {
      estoqueEl.style.color = '#111827';
      document.getElementById('card-estoque-critico').style.borderLeftColor = '#E5E7EB';
    }
  },

  renderVendasDiarias: function(dados) {
    const container = document.getElementById('chart-vendas-diarias');
    container.innerHTML = '';
    
    if (!dados || dados.length === 0) {
      container.innerHTML = '<div style="width: 100%; text-align: center; color: #9CA3AF; margin-bottom: 2rem;">Sem dados no período</div>';
      return;
    }

    const maxValor = Math.max(...dados.map(d => d.valor)) || 1; // Evitar div por zero
    
    dados.forEach(d => {
      const heightPercent = (d.valor / maxValor) * 100;
      const dia = d.data.split('-')[2]; // Pega o dia
      const formatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.valor);
      
      const barWrapper = document.createElement('div');
      barWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; flex: 1; min-width: 15px; max-width: 40px; group; position: relative;';
      barWrapper.title = \`Dia \${dia}: \${formatado}\`;
      
      const bar = document.createElement('div');
      bar.style.cssText = \`width: 80%; background-color: #DC2626; border-radius: 4px 4px 0 0; height: \${heightPercent}%; transition: height 0.5s ease; min-height: 2px;\`;
      bar.addEventListener('mouseover', (e) => e.target.style.opacity = '0.8');
      bar.addEventListener('mouseout', (e) => e.target.style.opacity = '1');
      
      const label = document.createElement('div');
      label.style.cssText = 'font-size: 0.7rem; color: #6B7280; margin-top: 4px; text-align: center; position: absolute; bottom: -20px;';
      label.innerText = dia;
      
      barWrapper.appendChild(bar);
      barWrapper.appendChild(label);
      container.appendChild(barWrapper);
    });
  },

  renderFluxoCaixa: function(dados) {
    const container = document.getElementById('chart-fluxo-caixa');
    container.innerHTML = '';
    
    const meses = Object.keys(dados).sort(); // YYYY-MM
    if (meses.length === 0) {
      container.innerHTML = '<div style="width: 100%; text-align: center; color: #9CA3AF; margin-bottom: 2rem;">Sem dados no período</div>';
      return;
    }

    let maxValor = 0;
    meses.forEach(m => {
      if (dados[m].entradas > maxValor) maxValor = dados[m].entradas;
      if (dados[m].saidas > maxValor) maxValor = dados[m].saidas;
    });
    maxValor = maxValor || 1;

    meses.forEach(m => {
      const entradaH = (dados[m].entradas / maxValor) * 100;
      const saidaH = (dados[m].saidas / maxValor) * 100;
      
      const formatE = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados[m].entradas);
      const formatS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados[m].saidas);
      
      const groupWrapper = document.createElement('div');
      groupWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; flex: 1; position: relative;';
      
      const barsContainer = document.createElement('div');
      barsContainer.style.cssText = 'display: flex; align-items: flex-end; gap: 2px; height: 100%; width: 60%; justify-content: center;';
      
      const barEntrada = document.createElement('div');
      barEntrada.style.cssText = \`width: 50%; background-color: #10B981; border-radius: 4px 4px 0 0; height: \${entradaH}%; min-height: 2px;\`;
      barEntrada.title = \`Entradas: \${formatE}\`;
      
      const barSaida = document.createElement('div');
      barSaida.style.cssText = \`width: 50%; background-color: #DC2626; border-radius: 4px 4px 0 0; height: \${saidaH}%; min-height: 2px;\`;
      barSaida.title = \`Saídas: \${formatS}\`;
      
      const label = document.createElement('div');
      label.style.cssText = 'font-size: 0.75rem; color: #6B7280; margin-top: 4px; text-align: center; position: absolute; bottom: -20px;';
      const [ano, mes] = m.split('-');
      label.innerText = \`\${mes}/\${ano.substring(2)}\`;
      
      barsContainer.appendChild(barEntrada);
      barsContainer.appendChild(barSaida);
      groupWrapper.appendChild(barsContainer);
      groupWrapper.appendChild(label);
      container.appendChild(groupWrapper);
    });
  },

  renderTopProdutos: function(produtos) {
    const tbody = document.getElementById('tbody-top-produtos');
    tbody.innerHTML = '';
    
    if (!produtos || produtos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #6B7280;">Nenhum produto vendido no período.</td></tr>';
      return;
    }

    const maxValor = produtos[0]?.valor || 1;

    produtos.forEach((prod, index) => {
      const formatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.valor);
      const widthPercent = (prod.valor / maxValor) * 100;
      
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #E5E7EB';
      
      tr.innerHTML = \`
        <td style="padding: 0.75rem;">\${index + 1}º</td>
        <td style="padding: 0.75rem; font-weight: 500;">\${prod.nome}</td>
        <td style="padding: 0.75rem; text-align: center;">\${prod.qtd}</td>
        <td style="padding: 0.75rem; text-align: right;">\${formatado}</td>
        <td style="padding: 0.75rem; vertical-align: middle;">
          <div style="width: 100%; background: #F3F4F6; border-radius: 99px; height: 8px; overflow: hidden;">
            <div style="width: \${widthPercent}%; background: #DC2626; height: 100%; border-radius: 99px;"></div>
          </div>
        </td>
      \`;
      tbody.appendChild(tr);
    });
  },

  exportPdf: function() {
    const dataInicial = document.getElementById('dash-data-inicial').value;
    const dataFinal = document.getElementById('dash-data-final').value;
    const empresaId = window.appController.empresaAtiva;
    
    let url = \`/dashboard/export-pdf?empresaId=\${empresaId}\`;
    if (dataInicial) url += \`&dataInicial=\${dataInicial}\`;
    if (dataFinal) url += \`&dataFinal=\${dataFinal}\`;

    window.appController.showToast('Gerando PDF...', 'info');
    
    // Create an invisible iframe or use window.open to trigger download
    window.api.download(url);
  }
};

window.DashboardPage = DashboardPage;
