/**
 * A7SYSTEM - Página de Vendas
 */

window.VendasPage = (function() {
  let carrinho = [];
  let clienteSelecionado = null;

  // Mock Data
  const mockVendas = [
    { id: '1', pedido: 'A700001', data: '2026-09-16', cliente: 'João da Silva', itens: 3, total: 1500.00, status: 'Concluída' },
    { id: '2', pedido: 'A700002', data: '2026-09-15', cliente: 'Maria Oliveira', itens: 1, total: 350.50, status: 'Pendente' },
    { id: '3', pedido: 'A700003', data: '2026-09-14', cliente: 'Empresa XYZ LTDA', itens: 10, total: 12400.00, status: 'Concluída' }
  ];

  const mockProdutos = [
    { id: 'p1', codigo: 'PROD-01', descricao: 'Notebook Dell Inspiron', valor: 4500.00, estoque: 5 },
    { id: 'p2', codigo: 'PROD-02', descricao: 'Mouse sem fio Logitech', valor: 120.00, estoque: 50 },
    { id: 'p3', codigo: 'PROD-03', descricao: 'Teclado Mecânico', valor: 350.00, estoque: 2 }
  ];

  const mockClientes = [
    { id: 'c1', nome: 'João da Silva', documento: '111.222.333-44', endereco: 'Rua A, 123' },
    { id: 'c2', nome: 'Maria Oliveira', documento: '555.666.777-88', endereco: 'Av B, 456' }
  ];

  function render() {
    renderList();
  }

  function renderList() {
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">Vendas</h2>
        <button id="btn-nova-venda" class="btn btn-primary" style="background-color: var(--primary-color); border-color: var(--primary-color); font-size: 1.1rem; padding: 0.75rem 1.5rem;">+ Nova Venda</button>
      </div>

      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <label class="form-label">Data Inicial</label>
            <input type="date" class="form-control" id="filtro-data-ini">
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label class="form-label">Data Final</label>
            <input type="date" class="form-control" id="filtro-data-fim">
          </div>
          <div style="flex: 2; min-width: 300px;">
            <label class="form-label">Cliente (Busca)</label>
            <input type="text" class="form-control" id="filtro-cliente" placeholder="Nome ou CPF/CNPJ">
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label class="form-label">Nº Pedido</label>
            <input type="text" class="form-control" id="filtro-pedido" placeholder="Ex: A700001">
          </div>
          <div>
            <button class="btn btn-secondary">Filtrar</button>
          </div>
        </div>
      </div>

      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #E5E7EB; text-align: left;">
              <th style="padding: 0.75rem;">Nº Pedido</th>
              <th style="padding: 0.75rem;">Data</th>
              <th style="padding: 0.75rem;">Cliente</th>
              <th style="padding: 0.75rem;">Qtd Itens</th>
              <th style="padding: 0.75rem;">Total (BRL)</th>
              <th style="padding: 0.75rem;">Status</th>
              <th style="padding: 0.75rem; text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${mockVendas.map(v => `
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 0.75rem;"><strong>${v.pedido}</strong></td>
                <td style="padding: 0.75rem;">${formatDate(v.data)}</td>
                <td style="padding: 0.75rem;">${v.cliente}</td>
                <td style="padding: 0.75rem;">${v.itens}</td>
                <td style="padding: 0.75rem;">R$ ${v.total.toFixed(2).replace('.', ',')}</td>
                <td style="padding: 0.75rem;">
                  <span class="badge ${v.status === 'Concluída' ? 'badge-success' : 'badge-warning'}">${v.status}</span>
                </td>
                <td style="padding: 0.75rem; text-align: right;">
                  <button class="btn btn-sm btn-outline btn-detalhes" data-id="${v.id}">Detalhes</button>
                  <button class="btn btn-sm btn-outline btn-recibo" data-id="${v.id}" title="Imprimir Recibo">📄</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    window.appController.renderPage(html);
    
    document.getElementById('btn-nova-venda').addEventListener('click', renderForm);
    
    document.querySelectorAll('.btn-detalhes').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        abrirModalDetalhes(id);
      });
    });

    document.querySelectorAll('.btn-recibo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        window.appController.showToast('Baixando recibo em PDF...', 'info');
      });
    });
  }

  function renderForm() {
    carrinho = [];
    clienteSelecionado = null;
    
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">Nova Venda</h2>
        <button id="btn-voltar" class="btn btn-secondary">Voltar para Vendas</button>
      </div>

      <!-- SEÇÃO 1: CLIENTE -->
      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">1. Cliente</h3>
        <div style="display: flex; gap: 1rem; align-items: flex-end;">
          <div style="flex: 1;">
            <label class="form-label">Buscar Cliente</label>
            <input type="text" id="busca-cliente" class="form-control" placeholder="Digite o nome ou CPF/CNPJ...">
          </div>
          <div>
            <button id="btn-novo-cliente" class="btn btn-outline">+ Novo Cliente</button>
          </div>
        </div>
        <div id="dados-cliente" style="margin-top: 1rem; padding: 1rem; background: #F9FAFB; border-radius: 4px; display: none;">
          <!-- Preenchido via JS -->
        </div>
      </div>

      <!-- SEÇÃO 2: PRODUTOS -->
      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">2. Carrinho de Produtos</h3>
        <div style="margin-bottom: 1.5rem;">
          <label class="form-label">Buscar Produto</label>
          <div style="position: relative;">
            <input type="text" id="busca-produto" class="form-control" placeholder="🔍 Digite código ou descrição do produto..." style="font-size: 1.1rem; padding: 0.75rem;">
          </div>
        </div>

        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #E5E7EB; text-align: left;">
              <th style="padding: 0.75rem;">Produto</th>
              <th style="padding: 0.75rem; text-align: center;">Estoque</th>
              <th style="padding: 0.75rem; width: 100px;">Qtd</th>
              <th style="padding: 0.75rem; text-align: right;">Val. Unit.</th>
              <th style="padding: 0.75rem; width: 120px;">Desconto</th>
              <th style="padding: 0.75rem; text-align: right;">Subtotal</th>
              <th style="padding: 0.75rem; text-align: center;">Ações</th>
            </tr>
          </thead>
          <tbody id="tbody-carrinho">
            <tr><td colspan="7" style="text-align: center; padding: 2rem; color: #6B7280;">Nenhum produto no carrinho.</td></tr>
          </tbody>
        </table>
      </div>

      <!-- RODAPÉ TOTAL -->
      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-top: 4px solid var(--primary-color);">
        <div>
          <span style="font-size: 1.2rem; color: #6B7280;">Resumo:</span>
          <div style="font-size: 1rem; color: #374151; margin-top: 0.5rem;" id="resumo-carrinho">0 itens</div>
        </div>
        <div style="text-align: right; display: flex; align-items: center; gap: 2rem;">
          <div>
            <div style="font-size: 1rem; color: #6B7280; text-transform: uppercase; font-weight: bold;">Total da Venda</div>
            <div id="total-venda" style="font-size: 2.5rem; color: var(--primary-color); font-weight: bold; line-height: 1;">R$ 0,00</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <button id="btn-finalizar-venda" class="btn" style="background-color: #10B981; color: white; border: none; font-size: 1.2rem; padding: 1rem 2rem; border-radius: 4px; cursor: pointer; font-weight: bold;">FINALIZAR VENDA</button>
            <button id="btn-cancelar" class="btn btn-outline">Cancelar</button>
          </div>
        </div>
      </div>
    `;

    window.appController.renderPage(html);

    // Eventos
    document.getElementById('btn-voltar').addEventListener('click', renderList);
    document.getElementById('btn-cancelar').addEventListener('click', renderList);

    const inputBuscaCliente = document.getElementById('busca-cliente');
    inputBuscaCliente.addEventListener('change', (e) => {
      // Mock busca de cliente
      const val = e.target.value.toLowerCase();
      const cli = mockClientes.find(c => c.nome.toLowerCase().includes(val) || c.documento.includes(val));
      if (cli) {
        selecionarCliente(cli);
      } else {
        window.appController.showToast('Cliente não encontrado.', 'warning');
      }
      e.target.value = '';
    });

    const inputBuscaProduto = document.getElementById('busca-produto');
    inputBuscaProduto.addEventListener('change', (e) => {
      const val = e.target.value.toLowerCase();
      const prod = mockProdutos.find(p => p.codigo.toLowerCase().includes(val) || p.descricao.toLowerCase().includes(val));
      if (prod) {
        adicionarProduto(prod);
      } else {
        window.appController.showToast('Produto não encontrado.', 'warning');
      }
      e.target.value = '';
    });

    document.getElementById('btn-finalizar-venda').addEventListener('click', confirmarVenda);
  }

  function selecionarCliente(cli) {
    clienteSelecionado = cli;
    const div = document.getElementById('dados-cliente');
    div.style.display = 'block';
    div.innerHTML = \`
      <strong>\${cli.nome}</strong> (Doc: \${cli.documento})<br>
      <span style="color: #6B7280; font-size: 0.9rem;">Endereço: \${cli.endereco}</span>
    \`;
  }

  function adicionarProduto(prod) {
    const itemExistente = carrinho.find(i => i.produto.id === prod.id);
    if (itemExistente) {
      itemExistente.quantidade++;
    } else {
      carrinho.push({
        idItem: 'item_' + Date.now(),
        produto: prod,
        quantidade: 1,
        desconto: 0
      });
    }
    atualizarCarrinho();
  }

  function removerProduto(idItem) {
    carrinho = carrinho.filter(i => i.idItem !== idItem);
    atualizarCarrinho();
  }

  function atualizarCarrinho() {
    const tbody = document.getElementById('tbody-carrinho');
    let html = '';
    let totalVenda = 0;
    let qtdItens = 0;
    let totalDesconto = 0;

    if (carrinho.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #6B7280;">Nenhum produto no carrinho.</td></tr>';
      document.getElementById('total-venda').innerText = 'R$ 0,00';
      document.getElementById('resumo-carrinho').innerText = '0 itens';
      return;
    }

    carrinho.forEach(item => {
      const subtotal = (item.quantidade * item.produto.valor) - item.desconto;
      totalVenda += subtotal;
      qtdItens += item.quantidade;
      totalDesconto += item.desconto;
      
      const qtdErro = item.quantidade > item.produto.estoque;

      html += \`
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 0.75rem;">
            <strong>\${item.produto.codigo}</strong><br>
            <span style="font-size: 0.9rem; color: #6B7280;">\${item.produto.descricao}</span>
          </td>
          <td style="padding: 0.75rem; text-align: center;">\${item.produto.estoque}</td>
          <td style="padding: 0.75rem;">
            <input type="number" min="1" value="\${item.quantidade}" class="form-control qtd-input" data-id="\${item.idItem}" style="width: 100%; \${qtdErro ? 'border-color: red;' : ''}" title="\${qtdErro ? 'Quantidade maior que estoque!' : ''}">
          </td>
          <td style="padding: 0.75rem; text-align: right;">R$ \${item.produto.valor.toFixed(2).replace('.', ',')}</td>
          <td style="padding: 0.75rem;">
            <input type="number" min="0" step="0.01" value="\${item.desconto}" class="form-control desc-input" data-id="\${item.idItem}" style="width: 100%;">
          </td>
          <td style="padding: 0.75rem; text-align: right; font-weight: bold;">R$ \${subtotal.toFixed(2).replace('.', ',')}</td>
          <td style="padding: 0.75rem; text-align: center;">
            <button class="btn btn-sm btn-outline btn-remover" data-id="\${item.idItem}" style="color: red; border-color: red;">X</button>
          </td>
        </tr>
      \`;
    });

    tbody.innerHTML = html;
    
    document.getElementById('total-venda').innerText = \`R$ \${totalVenda.toFixed(2).replace('.', ',')}\`;
    document.getElementById('resumo-carrinho').innerHTML = \`\${qtdItens} itens | Descontos: R$ \${totalDesconto.toFixed(2).replace('.', ',')}\`;

    // Re-bind eventos
    document.querySelectorAll('.btn-remover').forEach(btn => {
      btn.addEventListener('click', (e) => removerProduto(e.target.getAttribute('data-id')));
    });

    document.querySelectorAll('.qtd-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idItem = e.target.getAttribute('data-id');
        const item = carrinho.find(i => i.idItem === idItem);
        if (item) {
          item.quantidade = parseInt(e.target.value) || 1;
          atualizarCarrinho();
        }
      });
    });

    document.querySelectorAll('.desc-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idItem = e.target.getAttribute('data-id');
        const item = carrinho.find(i => i.idItem === idItem);
        if (item) {
          item.desconto = parseFloat(e.target.value) || 0;
          atualizarCarrinho();
        }
      });
    });
  }

  function confirmarVenda() {
    if (!clienteSelecionado) {
      window.appController.showToast('Por favor, selecione um cliente.', 'error');
      return;
    }
    if (carrinho.length === 0) {
      window.appController.showToast('O carrinho está vazio.', 'error');
      return;
    }

    const total = document.getElementById('total-venda').innerText;
    if (confirm(\`Confirmar venda de \${total} para \${clienteSelecionado.nome}?\`)) {
      window.appController.showLoading();
      setTimeout(() => {
        window.appController.hideLoading();
        window.appController.showToast('Venda finalizada com sucesso!', 'success');
        renderList(); // volta pra listagem
      }, 1000);
    }
  }

  function abrirModalDetalhes(idVenda) {
    const venda = mockVendas.find(v => v.id === idVenda);
    if (!venda) return;

    const html = \`
      <div style="padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 1rem; margin-bottom: 1rem;">
          <h3 style="margin: 0;">Detalhes da Venda - \${venda.pedido}</h3>
          <button class="btn btn-outline" onclick="window.appController.closeModal()">Fechar</button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; background: #F9FAFB; padding: 1rem; border-radius: 4px;">
          <div><strong>Cliente:</strong> \${venda.cliente}</div>
          <div><strong>Data:</strong> \${formatDate(venda.data)}</div>
          <div><strong>Status:</strong> \${venda.status}</div>
          <div><strong>Total:</strong> R$ \${venda.total.toFixed(2).replace('.', ',')}</div>
        </div>

        <h4 style="margin-bottom: 0.5rem;">Itens</h4>
        <table class="table" style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
          <thead>
            <tr style="border-bottom: 1px solid #ccc; text-align: left;">
              <th>Produto</th>
              <th>Qtd</th>
              <th>Val. Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <!-- mock items -->
            <tr style="border-bottom: 1px solid #eee;">
              <td>Notebook Dell Inspiron</td>
              <td>1</td>
              <td>R$ 1.500,00</td>
              <td>R$ 1.500,00</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 1rem;">
          <h4 style="margin: 0;">Recebimentos</h4>
          <button class="btn btn-primary btn-sm" id="btn-registrar-recebimento">Registrar Recebimento</button>
        </div>
        <table class="table" style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; margin-bottom: 1.5rem;">
          <thead>
            <tr style="border-bottom: 1px solid #ccc; text-align: left;">
              <th>Data</th>
              <th>Forma</th>
              <th>Valor</th>
              <th>Obs</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #eee;">
              <td>\${formatDate(venda.data)}</td>
              <td>PIX</td>
              <td>R$ \${venda.total.toFixed(2).replace('.', ',')}</td>
              <td>Sinal</td>
            </tr>
          </tbody>
        </table>
        
        <div style="text-align: right;">
          <button class="btn btn-secondary">Imprimir Recibo PDF</button>
        </div>
      </div>
    \`;

    window.appController.showModal(html);
    
    document.getElementById('btn-registrar-recebimento').addEventListener('click', abrirSubModalRecebimento);
  }

  function abrirSubModalRecebimento() {
    const html = \`
      <div style="padding: 1rem;">
        <h3 style="margin-top: 0; margin-bottom: 1rem;">Registrar Recebimento</h3>
        <div style="margin-bottom: 1rem;">
          <label class="form-label">Data</label>
          <input type="date" class="form-control" id="rec-data" value="\${new Date().toISOString().split('T')[0]}">
        </div>
        <div style="margin-bottom: 1rem;">
          <label class="form-label">Forma de Pagamento</label>
          <select class="form-control" id="rec-forma">
            <option value="Dinheiro">Dinheiro</option>
            <option value="PIX">PIX</option>
            <option value="Cartão">Cartão</option>
            <option value="Boleto">Boleto</option>
            <option value="Transferência">Transferência</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div style="margin-bottom: 1rem;">
          <label class="form-label">Valor (R$)</label>
          <input type="number" step="0.01" class="form-control" id="rec-valor">
        </div>
        <div style="margin-bottom: 1rem;">
          <label class="form-label">Observações</label>
          <textarea class="form-control" id="rec-obs" rows="2"></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button class="btn btn-outline" id="btn-cancel-rec">Cancelar</button>
          <button class="btn btn-primary" id="btn-salvar-rec">Salvar</button>
        </div>
      </div>
    \`;
    window.appController.showModal(html);

    document.getElementById('btn-cancel-rec').addEventListener('click', window.appController.closeModal);
    document.getElementById('btn-salvar-rec').addEventListener('click', () => {
      window.appController.showToast('Recebimento registrado com sucesso!', 'success');
      window.appController.closeModal();
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return \`\${d}/\${m}/\${y}\`;
  }

  return { render };
})();
