/**
 * Wrapper de API para comunicação com backend Python (Cloud Run/FastAPI)
 */

class ApiClient {
  constructor() {
    this.baseUrl = window.API_BASE_URL || '/api';
  }

  async getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Obter JWT Token
    const token = localStorage.getItem('a7_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (window.auth && window.auth.currentUser) {
      try {
        const fbToken = await window.auth.currentUser.getIdToken(false);
        headers['Authorization'] = `Bearer ${fbToken}`;
      } catch(e) {
        console.error('Erro ao obter token', e);
      }
    }

    // Obter Empresa ID do escopo da aplicação
    const empresaId = localStorage.getItem('a7_empresa_ativa');
    if (empresaId) {
      headers['X-Empresa-Id'] = empresaId;
    }

    return headers;
  }

  async request(method, path, data = null, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = await this.getHeaders();
    
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const config = {
      method,
      headers
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url, config);

        if (response.status === 401) {
          // Token expirado ou inválido
          if (window.appController) window.appController.logout();
          throw new Error('Não autorizado. Faça login novamente.');
        }

        if (response.status === 403) {
          if (window.appController) window.appController.showToast('Permissão negada para esta ação.', 'error');
          throw new Error('Acesso negado.');
        }

        if (!response.ok) {
          // Erro no servidor (5xx) pode tentar novamente, mas se for 4xx não.
          if (response.status >= 500 && attempts < maxAttempts - 1) {
            attempts++;
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Erro de servidor: ${response.status}`);
        }

        // Se for requisição sem retorno JSON esperado
        if (response.status === 204) return null;

        return await response.json();
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        attempts++;
      }
    }
  }

  get(path, options) { return this.request('GET', path, null, options); }
  post(path, data, options) { return this.request('POST', path, data, options); }
  put(path, data, options) { return this.request('PUT', path, data, options); }
  patch(path, data, options) { return this.request('PATCH', path, data, options); }
  delete(path, options) { return this.request('DELETE', path, null, options); }
}

window.api = new ApiClient();
