import { t } from './ui.i18n.service.js';

function createModalTemplate(title, message, type) {
  const isConfirm = type === 'confirm';
  return `
    <div class="modal-overlay" id="custom-modal-overlay">
      <div class="modal-content glass-panel fade-in">
        <h2 style="margin-bottom: 1rem; color: var(--primary-color);">${title}</h2>
        <p style="margin-bottom: 2rem; font-size: 1.1rem;">${message}</p>
        <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: center;">
          ${isConfirm ? `<button class="secondary" id="modal-btn-cancel">${t('cancel', {}, 'Cancel')}</button>` : ''}
          <button class="primary" id="modal-btn-ok">OK</button>
        </div>
      </div>
    </div>
  `;
}

function injectModalStyles() {
  if (document.getElementById('modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'modal-styles';
  style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(5px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-content {
      max-width: 400px;
      width: 100%;
      text-align: center;
      padding: 2rem;
      border: 1px solid rgba(255,255,255,0.2);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .toast-message {
      position: fixed;
      top: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface-color, #1e293b);
      color: var(--text-primary, white);
      padding: 1rem 2rem;
      border-radius: 2rem;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
      z-index: 10000;
      font-size: 1.1rem;
      pointer-events: none;
      transition: opacity 0.3s;
    }
  `;
  document.head.appendChild(style);
}

export function showToast(message, duration = 5000) {
  injectModalStyles();
  const toast = document.createElement('div');
  toast.className = 'toast-message fade-in';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showAlert(title, message) {
  return new Promise((resolve) => {
    injectModalStyles();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = createModalTemplate(title, message, 'alert');
    document.body.appendChild(wrapper.firstElementChild);

    const overlay = document.getElementById('custom-modal-overlay');
    const btnOk = document.getElementById('modal-btn-ok');

    const cleanup = () => {
      overlay.remove();
      resolve(true);
    };

    btnOk.addEventListener('click', cleanup);
  });
}

export function showConfirm(title, message) {
  return new Promise((resolve) => {
    injectModalStyles();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = createModalTemplate(title, message, 'confirm');
    document.body.appendChild(wrapper.firstElementChild);

    const overlay = document.getElementById('custom-modal-overlay');
    const btnOk = document.getElementById('modal-btn-ok');
    const btnCancel = document.getElementById('modal-btn-cancel');

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };

    btnOk.addEventListener('click', () => cleanup(true));
    btnCancel.addEventListener('click', () => cleanup(false));
  });
}
