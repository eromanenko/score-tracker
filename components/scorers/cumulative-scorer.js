import { getValue, saveValue } from '../../storage.service.js';
import { t, getLanguage } from '../../ui.i18n.service.js';
import { showAlert, showConfirm } from '../../modal.service.js';

class CumulativeScorer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.game = getValue('selected_game');
    this.players = getValue('players');
    this.roundInputs = Array(this.players.length).fill('');
    this.render();
  }

  handleInput(index, value) {
    this.roundInputs[index] = value;
  }

  nextRound() {
    let hasInput = false;
    this.players.forEach((p, i) => {
      const val = parseInt(this.roundInputs[i], 10);
      if (!isNaN(val)) {
        p.score += val;
        p.history.push(val);
        hasInput = true;
      }
    });

    if (hasInput) {
      saveValue('players', this.players);
      this.roundInputs = Array(this.players.length).fill('');
      this.checkEndCondition();
      this.render();
    }
  }

  checkEndCondition() {
    const target = this.game.config.targetScore;
    if (!target) return;

    let ended = false;
    this.players.forEach(p => {
      if ((this.game.config.winCondition === 'lowest' && p.score >= target) ||
          (this.game.config.winCondition === 'highest' && p.score >= target)) {
        ended = true;
      }
    });

    if (ended) {
      const sorted = [...this.players].sort((a, b) => 
        this.game.config.winCondition === 'lowest' ? a.score - b.score : b.score - a.score
      );
      setTimeout(() => showAlert(t('winner'), sorted[0].name), 100);
    }
  }

  render() {
    const baseStyleHref = '../../style.css';

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

        .player-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid var(--surface-border);
          gap: 1rem;
        }
        
        .player-row:last-child {
          border-bottom: none;
        }
        
        .player-info {
          flex: 1;
        }
        
        .player-name {
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .player-total {
          font-size: 2rem;
          font-weight: 800;
          color: var(--primary-color);
        }
        
        .round-input {
          width: 80px;
          text-align: center;
        }
        
        .controls {
          margin-top: 2rem;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }
      </style>
      
      <div class="container fade-in">
        <header style="text-align: center; margin-bottom: 1.5rem;">
          <h2>${this.game['name' + getLanguage().toUpperCase()] || this.game.nameEN || this.game.id}</h2>
          <p>${t('score')}</p>
        </header>
        
        <div class="glass-panel">
          ${this.players.map((p, i) => `
            <div class="player-row">
              <div class="player-info">
                <div class="player-name">${p.name}</div>
              </div>
              <div class="player-total">${p.score}</div>
              <div>
                <input type="number" 
                       class="round-input" 
                       placeholder="+/-"
                       value="${this.roundInputs[i]}"
                       id="input-${i}" />
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="controls">
          <button class="secondary" id="btn-back">${t('new_game')}</button>
          <button class="secondary" id="btn-restart">${t('play_again')}</button>
          <button class="primary" id="btn-next">${t('next_round')} →</button>
        </div>
      </div>
    `;

    this.players.forEach((p, i) => {
      const input = this.shadowRoot.getElementById(`input-${i}`);
      input.addEventListener('input', (e) => this.handleInput(i, e.target.value));
    });

    this.shadowRoot.getElementById('btn-next').onclick = () => this.nextRound();
    this.shadowRoot.getElementById('btn-back').onclick = async () => {
      const confirm = await showConfirm(t('new_game'), t('confirm_new_game', {}, 'Are you sure you want to end this game?'));
      if (confirm) location.hash = 'game-select';
    };
    
    this.shadowRoot.getElementById('btn-restart').onclick = async () => {
      const confirm = await showConfirm(t('play_again'), t('confirm_play_again', {}, 'Are you sure you want to reset the scores?'));
      if (confirm) {
        this.players.forEach(p => {
          p.score = 0;
          p.history = [];
        });
        saveValue('players', this.players);
        this.roundInputs = Array(this.players.length).fill('');
        this.render();
      }
    };
  }
}

customElements.define('cumulative-scorer', CumulativeScorer);
