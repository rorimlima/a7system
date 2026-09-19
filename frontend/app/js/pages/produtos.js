/**
 * Módulo de Gestão de Produtos
 */

window.ProdutosPage = (function() {
  let produtos = [
    { id: 'prod_1', codigo: 'A7-1694857321000', codigoFornecedor: 'F123', descricao: 'Smartphone XYZ', ncm: '85171231', cfop: '5102', cst: '00', quantidade: 5, quantidadeMinima: 10, valorUnitario: 1500.00, desconto: 0, valorTotal: 1500.00, fotos: ['img1.jpg'] },
    { id: 'prod_2', codigo: 'A7-1694857400000', codigoFornecedor: 'F456', descricao: 'Notebook Pro 15', ncm: '84713012', cfop: '5102', cst: '00', quantidade: 25, quantidadeMinima: 5, valorUnitario: 4500.00, desconto: 100, valorTotal: 4400.00, fotos: [] }
  ];

  let currentPage = 1;
  const itemsPerPage = 10;

  function render() {
    const podeCriar = window.appController.can('produtos:criar');
    
    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2>Gestão de Produtos</h2>
        ${podeCriar ? `<button class="btn btn-primary" id="btn-novo-prod">Novo Produto</button>` : ''}
      </div>

      <div class="card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
          <input type="text" id="busca-prod" class="form-control" placeholder="Buscar por código ou descrição..." style="flex: 1; min-width: 250px; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;">
          <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 500; cursor: pointer;">
            <input type="checkbox" id="filtro-estoque-baixo"> Estoque Baixo
          </label>
        </div>

        <div class="table-responsive">
          <table class="table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #E5E7EB; text-align: left;">
                <th style="padding: 12px;">Código</th>
                <th style="padding: 12px;">Descrição</th>
                <th style="padding: 12px; text-align: right;">Qtd Atual</th>
                <th style="padding: 12px; text-align: right;">Qtd Mín.</th>
                <th style="padding: 12px; text-align: right;">Valor Unit.</th>
                <th style="padding: 12px; text-align: center;">Fotos</th>
                <th style="padding: 12px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="prod-tbody">
              <!-- Renderizado via JS -->
            </tbody>
          </table>
          <div id="paginacao-prod" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;"></div>
        </div>
      </div>
    `;

    window.appController.renderPage(html);
    bindEvents();
    renderTable();
  }

  function renderTable() {
    const podeEditar = window.appController.can('produtos:editar');
    
    const term = document.getElementById('busca-prod').value.toLowerCase();
    const estBaixo = document.getElementById('filtro-estoque-baixo').checked;

    let filtrados = produtos.filter(p => {
      const matchText = p.descricao.toLowerCase().includes(term) || p.codigo.toLowerCase().includes(term);
      const matchEstoque = estBaixo ? p.quantidade < p.quantidadeMinima : true;
      return matchText && matchEstoque;
    });

    const totalPages = Math.ceil(filtrados.length / itemsPerPage);
    if(currentPage > totalPages) currentPage = totalPages || 1;

    const inicio = (currentPage - 1) * itemsPerPage;
    const paginados = filtrados.slice(inicio, inicio + itemsPerPage);

    const tbody = document.getElementById('prod-tbody');
    
    if (paginados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 12px; text-align: center; color: #6B7280;">Nenhum produto encontrado.</td></tr>`;
    } else {
      tbody.innerHTML = paginados.map(p => {
        const isCritico = p.quantidade < p.quantidadeMinima;
        const rowBg = isCritico ? '#FEF2F2' : 'transparent';
        const qtyColor = isCritico ? '#DC2626' : 'inherit';
        
        return `
          <tr style="border-bottom: 1px solid #E5E7EB; background-color: ${rowBg};">
            <td style="padding: 12px; font-size: 0.9em; color: #4B5563;">${p.codigo}</td>
            <td style="padding: 12px; font-weight: 500;">${p.descricao}</td>
            <td style="padding: 12px; text-align: right; color: ${qtyColor}; font-weight: ${isCritico ? 'bold' : 'normal'};">${p.quantidade}</td>
            <td style="padding: 12px; text-align: right; color: #6B7280;">${p.quantidadeMinima}</td>
            <td style="padding: 12px; text-align: right;">R$ ${p.valorUnitario.toFixed(2)}</td>
            <td style="padding: 12px; text-align: center;">
              <span class="badge" style="background: #E5E7EB; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">${p.fotos.length}</span>
            </td>
            <td style="padding: 12px; text-align: right;">
              <button class="btn btn-outline btn-detalhe-prod" data-id="${p.id}" style="padding: 4px 8px; font-size: 12px;">Detalhes</button>
              ${podeEditar ? `<button class="btn btn-outline btn-editar-prod" data-id="${p.id}" style="padding: 4px 8px; font-size: 12px; margin-left: 4px;">Editar</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
    }

    renderPagination(totalPages);
    bindActionEvents();
  }

  function renderPagination(totalPages) {
    const pagDiv = document.getElementById('paginacao-prod');
    if (totalPages <= 1) {
      pagDiv.innerHTML = '';
      return;
    }
    
    let html = '';
    for(let i=1; i<=totalPages; i++) {
      html += `<button class="btn btn-pag" data-page="${i}" style="padding: 4px 8px; font-size: 12px; ${currentPage === i ? 'background: #111827; color: white;' : 'background: white; border: 1px solid #D1D5DB;'}">${i}</button>`;
    }
    pagDiv.innerHTML = html;

    document.querySelectorAll('.btn-pag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentPage = parseInt(e.target.getAttribute('data-page'));
        renderTable();
      });
    });
  }

  function bindEvents() {
    const btnNovo = document.getElementById('btn-novo-prod');
    if(btnNovo) btnNovo.addEventListener('click', () => openModal());

    document.getElementById('busca-prod').addEventListener('input', () => { currentPage = 1; renderTable(); });
    document.getElementById('filtro-estoque-baixo').addEventListener('change', () => { currentPage = 1; renderTable(); });
  }

  function bindActionEvents() {
    document.querySelectorAll('.btn-editar-prod').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const p = produtos.find(x => x.id === id);
        if (p) openModal(p);
      });
    });

    document.querySelectorAll('.btn-detalhe-prod').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const p = produtos.find(x => x.id === id);
        if (p) openDetailModal(p);
      });
    });
  }

  function openModal(prod = null) {
    const isEdit = !!prod;
    const sysCode = isEdit ? prod.codigo : 'A7-' + Date.now();

    const html = `
      <div style="padding: 1.5rem; max-width: 700px; margin: 0 auto; background: white; border-radius: 8px; max-height: 90vh; overflow-y: auto;">
        <h3 style="margin-top: 0; margin-bottom: 1.5rem;">${isEdit ? 'Editar Produto' : 'Novo Produto'}</h3>
        <form id="form-prod">
          <input type="hidden" id="p-id" value="${isEdit ? prod.id : ''}">
          
          <div style="background: #F9FAFB; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; border: 1px solid #E5E7EB;">
            <label style="display: block; font-weight: bold; color: #4B5563; font-size: 0.9em;">Código do Sistema (Automático)</label>
            <input type="text" id="p-codigo" readonly class="form-control" style="width: 100%; padding: 8px; background: transparent; border: none; font-family: monospace; font-size: 1.1em;" value="${sysCode}">
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Descrição *</label>
              <input type="text" id="p-desc" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" required value="${isEdit ? prod.descricao : ''}">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Cód. Fornecedor</label>
              <input type="text" id="p-codforn" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" value="${isEdit ? prod.codigoFornecedor : ''}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 120px), 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">NCM</label>
              <input type="text" id="p-ncm" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" value="${isEdit ? prod.ncm : ''}">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">CFOP</label>
              <input type="text" id="p-cfop" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" value="${isEdit ? prod.cfop : ''}">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">CST</label>
              <input type="text" id="p-cst" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" value="${isEdit ? prod.cst : ''}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 120px), 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Qtd Atual</label>
              <input type="number" id="p-qtd" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" value="${isEdit ? prod.quantidade : 0}">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Qtd Mínima</label>
              <input type="number" id="p-qtdmin" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" value="${isEdit ? prod.quantidadeMinima : 0}">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Valor Unitário (R$)</label>
              <input type="number" step="0.01" id="p-val" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px;" required value="${isEdit ? prod.valorUnitario : ''}">
            </div>
          </div>

          <div style="margin-bottom: 1.5rem; border: 1px dashed #D1D5DB; padding: 1rem; border-radius: 4px;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Upload de Fotos (Múltiplas)</label>
            <input type="file" id="p-fotos" multiple accept="image/*" class="form-control" style="width: 100%;">
            <div id="fotos-preview" style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
              <!-- Previews -->
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-secondary" onclick="window.appController.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    `;
    window.appController.showModal(html);

    // Preview
    const fileInput = document.getElementById('p-fotos');
    const previewDiv = document.getElementById('fotos-preview');

    fileInput.addEventListener('change', (e) => {
      previewDiv.innerHTML = '';
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          previewDiv.innerHTML += `<img src="${ev.target.result}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #E5E7EB;">`;
        };
        reader.readAsDataURL(file);
      });
    });

    document.getElementById('form-prod').addEventListener('submit', handleSave);
  }

  function openDetailModal(prod) {
    const isCritico = prod.quantidade < prod.quantidadeMinima;
    const qtyColor = isCritico ? '#DC2626' : '#059669';

    const html = `
      <div style="padding: 2rem; max-width: 600px; margin: 0 auto; background: white; border-radius: 8px;">
        <h2 style="margin-top: 0; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem;">${prod.descricao}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem;">
          <div>
            <p style="margin: 0 0 0.5rem 0;"><strong style="color: #6B7280;">Código Sis:</strong> ${prod.codigo}</p>
            <p style="margin: 0 0 0.5rem 0;"><strong style="color: #6B7280;">Cód Fornec:</strong> ${prod.codigoFornecedor || '-'}</p>
            <p style="margin: 0 0 0.5rem 0;"><strong style="color: #6B7280;">NCM:</strong> ${prod.ncm || '-'}</p>
            <p style="margin: 0 0 0.5rem 0;"><strong style="color: #6B7280;">CFOP:</strong> ${prod.cfop || '-'}</p>
          </div>
          <div>
            <p style="margin: 0 0 0.5rem 0;"><strong style="color: #6B7280;">Qtd Atual:</strong> <span style="color: ${qtyColor}; font-weight: bold; font-size: 1.2em;">${prod.quantidade}</span></p>
            <p style="margin: 0 0 0.5rem 0;"><strong style="color: #6B7280;">Qtd Mínima:</strong> ${prod.quantidadeMinima}</p>
            <p style="margin: 0 0 0.5rem 0;"><strong style="color: #6B7280;">Valor Unit:</strong> R$ ${prod.valorUnitario.toFixed(2)}</p>
          </div>
        </div>
        
        <div style="margin-top: 1.5rem;">
          <h4 style="margin: 0 0 0.5rem 0; color: #4B5563;">Galeria</h4>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; background: #F3F4F6; padding: 1rem; border-radius: 4px;">
            ${prod.fotos.length > 0 ? 
              prod.fotos.map((_, i) => `<div style="width: 80px; height: 80px; background: #D1D5DB; border-radius: 4px; display:flex; align-items:center; justify-content:center; color: #6B7280; font-size: 0.8em;">Foto ${i+1}</div>`).join('') 
              : '<span style="color: #9CA3AF;">Sem fotos cadastradas.</span>'}
          </div>
        </div>

        <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="window.appController.closeModal()">Fechar</button>
        </div>
      </div>
    `;
    window.appController.showModal(html);
  }

  async function handleSave(e) {
    e.preventDefault();
    const id = document.getElementById('p-id').value;
    const codigo = document.getElementById('p-codigo').value;
    const descricao = document.getElementById('p-desc').value;
    const codigoFornecedor = document.getElementById('p-codforn').value;
    const ncm = document.getElementById('p-ncm').value;
    const cfop = document.getElementById('p-cfop').value;
    const cst = document.getElementById('p-cst').value;
    const quantidade = parseInt(document.getElementById('p-qtd').value || 0);
    const quantidadeMinima = parseInt(document.getElementById('p-qtdmin').value || 0);
    const valorUnitario = parseFloat(document.getElementById('p-val').value || 0);
    
    // Na real: handle fotos array
    const fotos = []; 
    
    window.appController.showLoading();
    try {
      if (id) {
        const index = produtos.findIndex(x => x.id === id);
        if(index !== -1) {
          produtos[index] = { ...produtos[index], descricao, codigoFornecedor, ncm, cfop, cst, quantidade, quantidadeMinima, valorUnitario };
        }
        window.appController.showToast('Produto atualizado', 'success');
      } else {
        produtos.push({
          id: 'prod_' + Date.now(),
          codigo, descricao, codigoFornecedor, ncm, cfop, cst, quantidade, quantidadeMinima, valorUnitario, desconto: 0, valorTotal: valorUnitario, fotos
        });
        window.appController.showToast('Produto criado', 'success');
      }
      window.appController.closeModal();
      renderTable();
    } catch(err) {
      window.appController.showToast('Erro ao salvar', 'error');
    } finally {
      window.appController.hideLoading();
    }
  }

  return { render };
})();
