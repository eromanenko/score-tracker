import { getValue, saveValue } from '../../storage.service.js';
import { t, getLanguage } from '../../ui.i18n.service.js';
import { showConfirm, showToast } from '../../modal.service.js';

class CategoryScorer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.game = getValue('selected_game');
    this.players = getValue('players');
    this.categories = this.game.config.categories || [];
    
    // Initialize scores structure if not present
    this.players.forEach(p => {
      if (!p.categoryScores) {
        p.categoryScores = {};
        this.categories.forEach(c => p.categoryScores[c.id] = 0);
      }
    });

    this.render();
  }

  handleInput(playerId, catId, value) {
    const num = parseInt(value, 10) || 0;
    this.players[playerId].categoryScores[catId] = num;
    this.calculateTotals();
  }

  calculateTotals() {
    this.players.forEach(p => {
      let total = 0;
      this.categories.forEach(c => {
        const val = p.categoryScores[c.id];
        if (c.divider) {
          total += Math.floor(val / c.divider);
        } else {
          total += val;
        }
      });
      p.score = total;
    });
    saveValue('players', this.players);
    
    // Update UI totals without re-rendering everything
    this.players.forEach((p, i) => {
      const el = this.shadowRoot.getElementById(`total-${i}`);
      if (el) el.textContent = p.score;
    });
  }

  render() {
    const baseStyleHref = '../../style.css';

    const lang = getLanguage().toUpperCase();
    
    this.shadowRoot.innerHTML = `
      <style>
        @import url('${baseStyleHref}');
        
        :host {
          display: block;
          opacity: 0;
          animation: hostFadeIn 0.3s ease-out forwards;
        }

        @keyframes hostFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .table-container {
          overflow-x: auto;
          margin-top: 1rem;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 300px;
        }
        
        th, td {
          padding: 0.75rem;
          text-align: center;
          border-bottom: 1px solid var(--surface-border);
        }
        
        th:first-child, td:first-child {
          text-align: left;
          position: sticky;
          left: 0;
          background: var(--bg-color);
          z-index: 2;
        }
        
        input {
          width: 60px;
          text-align: center;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
        }
        
        .total-row {
          font-weight: bold;
          font-size: 1.2rem;
          background: rgba(255, 255, 255, 0.05);
        }
        
        .total-row td:first-child {
          background: var(--bg-color);
        }
        
        .cat-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          margin-right: 0.5rem;
          vertical-align: middle;
        }
        
        .cat-icon.large {
          width: 2.5rem;
          height: 2.5rem;
          margin-right: 0;
        }
        
        td:first-child.icon-only {
          text-align: center;
          padding: 0.25rem;
        }
        
        .cat-icon img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        .controls {
          margin-top: 2rem;
          display: flex;
          justify-content: center;
          gap: 1rem;
        }
      </style>
      
      <div class="container fade-in">
        <header style="text-align: center; margin-bottom: 1rem;">
          <h2>${this.game['name' + lang] || this.game.nameEN || this.game.id}</h2>
        </header>
        
        <div class="glass-panel table-container">
          <table>
            <thead>
              <tr>
                <th>${this.game.config.headerIconBlobUrl ? `<img src="${this.game.config.headerIconBlobUrl}" alt="${t('categories')}" style="height:1.5rem; vertical-align:middle;">` : t('categories')}</th>
                ${this.players.map(p => `<th>${p.name}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${this.categories.map((cat, index) => {
                const displayName = cat['name' + lang] || (cat.nameEN !== undefined ? cat.nameEN : cat.id);
                const hasName = displayName.trim().length > 0;
                return `
                <tr style="${cat.color ? `background-color: ${cat.color};` : ''}">
                  <td class="${hasName ? '' : 'icon-only'} category-header" data-cat="${index}" style="${cat.color ? `background-color: ${cat.color};` : ''} cursor: pointer;">
                    <span class="cat-icon ${hasName ? '' : 'large'}">${cat.iconBlobUrl ? `<img src="${cat.iconBlobUrl}" alt="${cat.id}">` : (cat.icon || '')}</span>
                    ${hasName ? displayName : ''}
                    ${cat.divider ? ` (/${cat.divider})` : ''}
                  </td>
                  ${this.players.map((p, i) => `
                    <td>
                      <input type="number" 
                             value="${p.categoryScores[cat.id] || ''}" 
                             id="input-${i}-${cat.id}" />
                    </td>
                  `).join('')}
                </tr>
              `}).join('')}
              <tr class="total-row">
                <td style="text-align: center;">${this.game.config.totalIconBlobUrl ? `<img src="${this.game.config.totalIconBlobUrl}" alt="${t('total')}" style="height:2rem; vertical-align:middle;">` : t('total')}</td>
                ${this.players.map((p, i) => `<td id="total-${i}">${p.score}</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="controls">
          <button class="secondary" id="btn-back">${t('new_game')}</button>
          <button class="primary" id="btn-restart">${t('play_again')}</button>
        </div>
      </div>
    `;

    // Attach listeners
    this.categories.forEach((cat, idx) => {
      this.players.forEach((p, i) => {
        const input = this.shadowRoot.getElementById(`input-${i}-${cat.id}`);
        input.addEventListener('input', (e) => this.handleInput(i, cat.id, e.target.value));
      });
    });

    this.shadowRoot.querySelectorAll('.category-header').forEach(header => {
      header.addEventListener('click', () => {
        const catIndex = header.getAttribute('data-cat');
        const cat = this.categories[catIndex];
        const lang = getLanguage().toUpperCase();
        const hint = cat['hint' + lang] || cat.hintEN;
        if (hint) {
          showToast(hint);
        }
      });
    });

    this.shadowRoot.getElementById('btn-back').onclick = async () => {
      const confirm = await showConfirm(t('new_game'), t('confirm_new_game', {}, 'Are you sure you want to end this game?'));
      if (confirm) location.hash = 'game-select';
    };
    
    this.shadowRoot.getElementById('btn-restart').onclick = async () => {
      const confirm = await showConfirm(t('play_again'), t('confirm_play_again', {}, 'Are you sure you want to reset the scores?'));
      if (confirm) {
        this.players.forEach(p => {
          this.categories.forEach(c => p.categoryScores[c.id] = 0);
          p.score = 0;
        });
        saveValue('players', this.players);
        this.render();
      }
    };
    
    // Initial calc
    this.calculateTotals();
  }
}

customElements.define('category-scorer', CategoryScorer);
