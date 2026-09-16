/**
 * A7SYSTEM - Página de Login
 */
const LoginPage = {
  render: () => {
    const container = document.getElementById('login-container');
    container.innerHTML = `
      <div class="card login-card" style="max-width: 400px; margin: 10vh auto; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); background: white;">
        <div class="card-header" style="text-align: center; margin-bottom: 2rem;">
          <h1 style="color: var(--color-primary, #DC2626); font-size: 2.5rem; margin: 0; font-weight: bold; letter-spacing: -1px;">A7SYSTEM</h1>
          <p style="color: var(--color-text-secondary, #6B7280); margin-top: 0.5rem;">Gestão Empresarial</p>
        </div>
        <form id="dynamic-login-form">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" for="dyn-login-email" style="display:block; margin-bottom:0.5rem; font-weight:500;">E-mail</label>
            <div style="position: relative;">
              <span style="position: absolute; left: 10px; top: 10px; color: #9CA3AF;">📧</span>
              <input type="email" id="dyn-login-email" class="form-control" required placeholder="seu@email.com" style="width: 100%; padding-left: 35px; box-sizing: border-box; padding: 0.5rem 0.5rem 0.5rem 2.2rem; border: 1px solid #D1D5DB; border-radius: 4px;">
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" for="dyn-login-senha" style="display:block; margin-bottom:0.5rem; font-weight:500;">Senha</label>
            <div style="position: relative;">
              <span style="position: absolute; left: 10px; top: 10px; color: #9CA3AF;">🔒</span>
              <input type="password" id="dyn-login-senha" class="form-control" required placeholder="Sua senha" style="width: 100%; padding-left: 35px; padding-right: 35px; box-sizing: border-box; padding: 0.5rem 2.2rem 0.5rem 2.2rem; border: 1px solid #D1D5DB; border-radius: 4px;">
              <button type="button" id="btn-toggle-senha" style="position: absolute; right: 5px; top: 5px; background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 0.25rem;">👁️</button>
            </div>
          </div>
          <button type="submit" id="btn-login-submit" class="btn btn-primary" style="width: 100%; justify-content: center; background-color: var(--color-primary, #DC2626); color: white; padding: 0.75rem; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; transition: background-color 0.2s;">
            Entrar
          </button>
        </form>
        <div style="text-align: center; margin-top: 1rem;">
          <a href="#" id="link-esqueci-senha" style="color: var(--color-primary, #DC2626); text-decoration: none; font-size: 0.9rem;">Esqueci minha senha</a>
        </div>
      </div>
    `;

    // Eventos
    const form = document.getElementById('dynamic-login-form');
    const toggleBtn = document.getElementById('btn-toggle-senha');
    const senhaInput = document.getElementById('dyn-login-senha');
    const esqueciBtn = document.getElementById('link-esqueci-senha');

    toggleBtn.addEventListener('click', () => {
      if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        toggleBtn.innerText = '🙈';
      } else {
        senhaInput.type = 'password';
        toggleBtn.innerText = '👁️';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('dyn-login-email').value;
      const senha = senhaInput.value;
      const btn = document.getElementById('btn-login-submit');
      
      const originalText = btn.innerText;
      btn.innerText = 'Autenticando...';
      btn.disabled = true;
      if (window.appController) window.appController.showLoading();

      try {
        await window.auth.signInWithEmailAndPassword(email, senha);
        if (window.appController) window.appController.showToast('Login efetuado com sucesso!', 'success');
      } catch (err) {
        let msg = 'Erro ao acessar. Tente novamente.';
        switch (err.code) {
          case 'auth/wrong-password': msg = 'Senha incorreta'; break;
          case 'auth/user-not-found': msg = 'Usuário não encontrado'; break;
          case 'auth/too-many-requests': msg = 'Muitas tentativas. Aguarde alguns minutos.'; break;
          case 'auth/invalid-email': msg = 'E-mail inválido'; break;
          case 'auth/user-disabled': msg = 'Conta desativada. Contate o administrador.'; break;
          case 'auth/invalid-credential': msg = 'Credenciais inválidas'; break;
        }
        if (window.appController) window.appController.showToast(msg, 'error');
        else alert(msg);
      } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        if (window.appController) window.appController.hideLoading();
      }
    });

    esqueciBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const html = `
        <div style="padding: 1rem;">
          <h3 style="margin-bottom: 1rem; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.5rem;">Recuperar Senha</h3>
          <p style="margin-bottom: 1rem; color: #6B7280; font-size: 0.9rem;">Informe seu e-mail para receber um link de redefinição.</p>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label class="form-label" for="reset-email" style="display:block; margin-bottom:0.5rem; font-weight:500;">E-mail</label>
            <input type="email" id="reset-email" class="form-control" required style="width: 100%; padding: 0.5rem; border: 1px solid #D1D5DB; border-radius: 4px;">
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid #E5E7EB; padding-top: 1rem;">
            <button class="btn btn-secondary" onclick="window.appController.closeModal()" style="padding: 0.5rem 1rem; border: 1px solid #D1D5DB; background: white; border-radius: 4px; cursor: pointer;">Cancelar</button>
            <button id="btn-send-reset" class="btn btn-primary" style="padding: 0.5rem 1rem; background-color: var(--color-primary, #DC2626); color: white; border: none; border-radius: 4px; cursor: pointer;">Enviar</button>
          </div>
        </div>
      `;
      if (window.appController) {
        window.appController.showModal(html);
        document.getElementById('btn-send-reset').addEventListener('click', async () => {
          const email = document.getElementById('reset-email').value;
          if (!email) return;
          try {
            window.appController.showLoading();
            await window.auth.sendPasswordResetEmail(email);
            window.appController.showToast('E-mail de recuperação enviado!', 'success');
            window.appController.closeModal();
          } catch (err) {
            window.appController.showToast('Erro: ' + err.message, 'error');
          } finally {
            window.appController.hideLoading();
          }
        });
      }
    });
  }
};

window.LoginPage = LoginPage;
