/**
 * Componentes de UI reutilizáveis (Shared Components)
 * Retornam strings HTML para facilitar renderização.
 */

window.UI = {
  /**
   * Cria uma tabela genérica
   */
  createTable: (headers, rows, actions = '') => {
    let thead = headers.map(h => `<th>${h}</th>`).join('');
    if(actions) thead += `<th>Ações</th>`;
    
    const tbody = rows.map(row => {
      let tr = row.data.map(cell => `<td>${cell}</td>`).join('');
      if(actions) {
        tr += `<td>${actions.replace(/{id}/g, row.id)}</td>`;
      }
      return `<tr>${tr}</tr>`;
    }).join('');

    return `
      <div class="table-responsive">
        <table>
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
  },

  /**
   * Cria um card padrão
   */
  createCard: (title, content, footer = '') => `
    <div class="card">
      ${title ? `<div class="card-header"><h3 class="card-title">${title}</h3></div>` : ''}
      <div class="card-body">${content}</div>
      ${footer ? `<div class="card-footer" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border);">${footer}</div>` : ''}
    </div>
  `,

  /**
   * Cria uma tag/badge de status
   */
  createBadge: (text, type = 'info') => {
    return `<span class="badge badge-${type}">${text}</span>`;
  },

  /**
   * Estado Vazio (Empty State)
   */
  createEmptyState: (icon, message, actionText = '', actionId = '') => `
    <div style="text-align: center; padding: 3rem 1rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">${icon}</div>
      <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">${message}</p>
      ${actionText ? `<button id="${actionId}" class="btn btn-primary">${actionText}</button>` : ''}
    </div>
  `,

  /**
   * Status KPI Card
   */
  createStatsCard: (title, value, icon = '', trend = '') => `
    <div class="card" style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">${title}</p>
        <h3 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin-top: 0.5rem;">${value}</h3>
        ${trend ? `<p style="font-size: var(--font-size-xs); margin-top: 0.5rem;">${trend}</p>` : ''}
      </div>
      ${icon ? `<div style="font-size: 2rem; opacity: 0.2;">${icon}</div>` : ''}
    </div>
  `,

  // Formatadores (Utilities)
  formatCurrency: (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  },

  formatDate: (dateString) => {
    if(!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR');
  },

  formatDateTime: (dateString) => {
    if(!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleString('pt-BR');
  },

  debounce: (func, delay) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }
};
