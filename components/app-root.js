import './game-select/game-select.js';
import './player-setup/player-setup.js';
import './score-tracker/score-tracker.js';
import { setLanguage, getLanguage, t } from '../ui.i18n.service.js';
import { getFilterMode, setFilterMode } from '../storage.service.js';

class AppRoot extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.isSettingsOpen = false;
    this.render();

    // Default route
    let currentHash = location.hash.slice(1);
    if (!currentHash) {
      currentHash = 'game-select';
      location.hash = currentHash;
    } else {
      this.routeTo(currentHash);
    }

    window.addEventListener('hashchange', () => {
      const page = location.hash.slice(1);
      this.routeTo(page || 'game-select');
    });

    window.addEventListener('language-changed', () => {
      this.render();
      const page = location.hash.slice(1) || 'game-select';
      this.routeTo(page); // Re-render current page to update translations
    });
  }

  routeTo(page) {
    const validRoutes = ['game-select', 'player-setup', 'score-board'];
    if (!validRoutes.includes(page)) page = 'game-select';

    const routerOutlet = this.shadowRoot.getElementById('router-outlet');
    if (routerOutlet) {
      routerOutlet.innerHTML = `<${page}></${page}>`;
    }
  }

  // Note: changeLanguage and changeFilter were replaced by direct handlers in render.



  toggleSettings() {
    this.isSettingsOpen = !this.isSettingsOpen;
    const overlay = this.shadowRoot.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.toggle('open', this.isSettingsOpen);
    }
  }

  render() {
    const baseStyleHref = './style.css';
    const lang = getLanguage();

    this.shadowRoot.innerHTML = `
      <style>
        @import url('${baseStyleHref}');
        :host {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
        }
        
        #router-outlet {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .burger-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 1001;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--surface-border);
          color: white;
          width: 3rem;
          height: 3rem;
          border-radius: var(--radius-sm);
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(5px);
        }

        .settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }

        .settings-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }

        .settings-modal {
          background: var(--bg-color);
          border: 1px solid var(--surface-border);
          padding: 2rem;
          border-radius: var(--radius-md);
          width: 90%;
          max-width: 400px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }

        .settings-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1rem;
        }

        .button-group {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          padding: 0.25rem;
          border: 1px solid var(--surface-border);
          width: 100%;
        }

        .button-group button {
          flex: 1;
          background: transparent;
          color: var(--text-secondary);
          border: none;
          padding: 0.75rem 0.5rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-family: var(--font-main);
          font-weight: 500;
          transition: all 0.2s;
        }

        .button-group button.active {
          background: var(--primary-color);
          color: white;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
        }
      </style>
      
      <button class="burger-btn" id="btn-burger">☰</button>

      <div class="settings-overlay ${this.isSettingsOpen ? 'open' : ''}" id="settings-overlay">
        <div class="settings-modal">
          <h2 style="margin-bottom: 2rem; text-align: center;">${t('settings')}</h2>
          
          <div class="settings-col">
            <label style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">${t('language')}</label>
            <div class="button-group" id="lang-group">
              <button data-val="en" class="${lang === 'en' ? 'active' : ''}">EN</button>
              <button data-val="uk" class="${lang === 'uk' ? 'active' : ''}">UA</button>
              <button data-val="ru" class="${lang === 'ru' ? 'active' : ''}">RU</button>
            </div>
          </div>

          <div class="settings-col">
            <label style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Games Filter</label>
            <div class="button-group" id="filter-group">
              <button data-val="all" class="${getFilterMode() === 'all' ? 'active' : ''}">${t('filter_all', {}, 'All Games')}</button>
              <button data-val="selected" class="${getFilterMode() === 'selected' ? 'active' : ''}">${t('filter_selected', {}, 'Selected')}</button>
            </div>
          </div>

          <div style="text-align: center; margin-top: 2rem;">
            <button class="primary" id="btn-close-settings">OK</button>
          </div>
        </div>
      </div>
      
      <div id="router-outlet"></div>
    `;

    this.shadowRoot.getElementById('btn-burger').onclick = () => this.toggleSettings();
    this.shadowRoot.getElementById('btn-close-settings').onclick = () => this.toggleSettings();

    this.shadowRoot.querySelectorAll('#lang-group button').forEach(btn => {
      btn.onclick = (e) => {
        setLanguage(e.target.getAttribute('data-val'));
        this.toggleSettings();
      };
    });

    this.shadowRoot.querySelectorAll('#filter-group button').forEach(btn => {
      btn.onclick = (e) => {
        setFilterMode(e.target.getAttribute('data-val'));
        this.toggleSettings();
        this.render();
        const page = location.hash.slice(1) || 'game-select';
        this.routeTo(page);
        window.dispatchEvent(new Event('filter-changed'));
      };
    });
  }
}

customElements.define('app-root', AppRoot);