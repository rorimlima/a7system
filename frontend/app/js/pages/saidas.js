/**
 * A7SYSTEM - Saídas e Ajustes de Estoque
 */

class SaidasPageManager {
  constructor() {
    this.saidas = [
      { id: '1', data: '16/09/2026', produto: 'Monitor 24" Dell', tipo: 'Ajuste', qtd: 1, motivo: 'Divergência', usuario: 'João' },
      { id: '2', data: '15/09/2026', produto: 'Mouse Sem Fio', tipo: 'Saída Manual', qtd: 2, motivo: 'Uso Interno', usuario: 'Maria' }
    ];
  }

  render() {
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">Saídas e Ajustes de Estoque</h2>
        <button class="btn btn-primary" onclick="window.SaidasPage.abrirModalSaida()" style="background-color: #DC2626; border-color: #DC2626;">Registrar Saída</button>
      </div>

      <div class="card">
        <div class="card-header"><h3 class="card-title">Saídas Recentes</h3></div>
        <div style="padding: 1rem;">
          ${window.UI.createTable(
            ['Data', 'Produto', 'Tipo', 'Qtd', 'Motivo', 'Usuário'],
            this.saidas.map(s => ({
              id: s.id,
              data: [s.data, s.produto, s.tipo, s.qtd, s.motivo, s.usuario]
            }))
          )}
        </div>
      </div>
    `;

    window.appController.renderPage(html);
  }

  abrirModalSaida() {
    const html = `
      <div style="padding: 1.5rem;">
        <h3 style="margin-top: 0;">Registrar Saída ou Ajuste</h3>
        
        <div class="form-group" style="margin-bottom: 1rem;">
          <label>Produto</label>
          <select class="form-control" id="saida-produto" onchange="window.SaidasPage.atualizarQtdAtual()">
            <option value="">Selecione um produto</option>
            <option value="1" data-qtd="15">PRD-001 - Monitor 24" Dell (Estoque: 15)</option>
            <option value="2" data-qtd="8">PRD-002 - Mouse Sem Fio (Estoque: 8)</option>
            <option value="3" data-qtd="0">PRD-003 - Teclado Mecânico (Estoque: 0)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 1rem;">
          <label>Tipo de Operação</label>
          <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
            <label><input type="radio" name="saida-tipo" value="Saída Manual" checked> Saída Manual</label>
            <label><input type="radio" name="saida-tipo" value="Ajuste de Estoque"> Ajuste de Estoque</label>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
          <div class="form-group" style="flex: 1;">
            <label>Quantidade</label>
            <input type="number" id="saida-qtd" class="form-control" min="1" value="1">
          </div>
          <div class="form-group" style="flex: 2;">
            <label>Motivo</label>
            <select id="saida-motivo" class="form-control">
              <option value="Perda">Perda</option>
              <option value="Quebra">Quebra</option>
              <option value="Furto">Furto</option>
              <option value="Divergência">Divergência</option>
              <option value="Uso Interno">Uso Interno</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 1rem;">
          <label>Observações</label>
          <textarea id="saida-obs" class="form-control" rows="2"></textarea>
        </div>

        <div id="saida-alerta" style="background-color: #FEF2F2; color: #DC2626; padding: 0.75rem; border-radius: 4px; margin-bottom: 1.5rem; display: none;">
          Atenção: esta operação irá debitar <span id="saida-alerta-qtd">0</span> unidades do estoque.
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button class="btn btn-outline" onclick="window.appController.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="window.SaidasPage.salvarSaida()" style="background-color: #DC2626; border-color: #DC2626;">Confirmar Saída</button>
        </div>
      </div>
    `;

    window.appController.showModal(html);
    
    // Adicionar listener para quantidade
    setTimeout(() => {
      document.getElementById('saida-qtd').addEventListener('input', (e) => {
        const val = e.target.value;
        const alerta = document.getElementById('saida-alerta');
        const alertaQtd = document.getElementById('saida-alerta-qtd');
        
        if (val > 0) {
          alerta.style.display = 'block';
          alertaQtd.innerText = val;
        } else {
          alerta.style.display = 'none';
        }
      });
    }, 100);
  }

  atualizarQtdAtual() {
    const select = document.getElementById('saida-produto');
    const option = select.options[select.selectedIndex];
    const qtdAtual = option ? parseInt(option.getAttribute('data-qtd') || '0') : 0;
    
    const inputQtd = document.getElementById('saida-qtd');
    inputQtd.max = qtdAtual;
    
    if (qtdAtual === 0 && select.value !== '') {
      window.appController.showToast('Produto sem estoque disponível.', 'error');
      inputQtd.value = 0;
    }
  }

  salvarSaida() {
    const produto = document.getElementById('saida-produto').value;
    const qtd = document.getElementById('saida-qtd').value;
    
    if (!produto || qtd <= 0) {
      window.appController.showToast('Preencha os campos corretamente.', 'error');
      return;
    }

    const select = document.getElementById('saida-produto');
    const option = select.options[select.selectedIndex];
    const qtdAtual = parseInt(option.getAttribute('data-qtd') || '0');

    if (qtd > qtdAtual) {
      window.appController.showToast('Quantidade informada é maior que o estoque atual!', 'error');
      return;
    }

    window.appController.showToast('Saída registrada com sucesso!', 'success');
    window.appController.closeModal();
    // Na real faria reload da lista
  }
}

window.SaidasPage = new SaidasPageManager();
