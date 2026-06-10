import { getValue, saveValue, getSavedPlayerNames, savePlayerName, loadGameBundle } from '../../storage.service.js';
import { t, getLanguage } from '../../ui.i18n.service.js';

class PlayerSetup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.game = null;
    this.numPlayers = 2;
    this.playerNames = [];
    this.savedNames = [];
  }

  async connectedCallback() {
    this.game = getValue('selected_game');
    if (!this.game) {
      location.hash = '';
      return;
    }
    
    if (!this.game.config) {
      this.game.config = await loadGameBundle(this.game);
      saveValue('selected_game', this.game);
    }
    
    this.savedNames = getSavedPlayerNames();
    this.numPlayers = this.game.minPlayers || 2;
    this.playerNames = Array(this.numPlayers).fill('');
    
    // Attempt to load previous players if continuing
    const prevPlayers = getValue('players');
    if (prevPlayers && prevPlayers.length >= this.numPlayers) {
        this.numPlayers = prevPlayers.length;
        this.playerNames = prevPlayers.map(p => p.name);
    }
    
    this.render();
  }

  updatePlayerCount(delta) {
    const newCount = this.numPlayers + delta;
    if (newCount >= this.game.minPlayers && newCount <= this.game.maxPlayers) {
      this.numPlayers = newCount;
      // Adjust array size
      if (this.playerNames.length < this.numPlayers) {
        this.playerNames.push('');
      } else if (this.playerNames.length > this.numPlayers) {
        this.playerNames.pop();
      }
      this.render();
      
      if (delta > 0) {
        setTimeout(() => {
          const input = this.shadowRoot.getElementById(`player-input-${this.numPlayers - 1}`);
          if (input) input.focus();
        }, 0);
      }
    }
  }

  removePlayer(index) {
    if (this.numPlayers > this.game.minPlayers) {
      this.playerNames.splice(index, 1);
      this.numPlayers--;
      this.render();
    }
  }

  handleNameInput(index, value) {
    this.playerNames[index] = value;
    this.renderTypeahead(index, value);
  }

  renderTypeahead(index, value) {
    const container = this.shadowRoot.getElementById(`typeahead-${index}`);
    if (!container) return;
    
    if (!value || value.length < 1) {
      container.innerHTML = '';
      return;
    }
    
    const matches = this.savedNames.filter(n => n.toLowerCase().includes(value.toLowerCase()) && n !== value);
    if (matches.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    container.innerHTML = `
      <div class="typeahead-list">
        ${matches.map(m => `<div class="typeahead-item" data-name="${m}">${m}</div>`).join('')}
      </div>
    `;
    
    container.querySelectorAll('.typeahead-item').forEach(item => {
      item.addEventListener('click', () => {
        this.playerNames[index] = item.getAttribute('data-name');
        container.innerHTML = '';
        this.render(); // Re-render to update input
      });
    });
  }

  startGame() {
    // Default names if empty
    const players = this.playerNames.map((name, i) => {
      const finalName = name.trim() || `Player ${i + 1}`;
      savePlayerName(finalName);
      return { name: finalName, score: 0, history: [] };
    });
    
    saveValue('players', players);
    location.hash = 'score-board';
  }

  render() {
    const baseStyle = document.querySelector('link[href="./style.css"]');
    const baseStyleHref = baseStyle ? baseStyle.href : '../../style.css';

    if (!this.shadowRoot.querySelector('#content')) {
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
          
          header {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .counter-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            margin-bottom: 2rem;
          }
          
          .counter-value {
            font-size: 2.5rem;
            font-weight: 800;
            min-width: 3rem;
            text-align: center;
          }
          
          .counter-btn {
            width: 3rem;
            height: 3rem;
            border-radius: 50%;
            font-size: 1.5rem;
            padding: 0;
          }
          
          .players-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 2.5rem;
          }
          
          .player-input-row {
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          
          .player-number {
            font-weight: 600;
            color: var(--text-secondary);
            width: 2rem;
            text-align: right;
          }
          
          .input-wrapper {
            flex: 1;
          }
          
          .actions {
            display: flex;
            justify-content: center;
            gap: 1rem;
          }
          
          .remove-player-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 1.2rem;
            cursor: pointer;
            padding: 0.5rem;
            opacity: 0.5;
            transition: opacity 0.2s, color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .remove-player-btn:hover {
            opacity: 1;
            color: #ff4444;
          }
        </style>
        <div id="content"></div>
      `;
    }

    const content = this.shadowRoot.getElementById('content');
    content.innerHTML = `
      <div class="container fade-in">
        <header>
          <h2>${this.game['name' + getLanguage().toUpperCase()] || this.game.nameEN || this.game.id}</h2>
          <p>${t('player_setup')}</p>
        </header>
        
        <div class="glass-panel" style="padding: 2rem; margin-bottom: 2rem;">
          <div style="text-align: center; margin-bottom: 1rem; color: var(--text-secondary);">${t('num_players')}</div>
          <div class="counter-controls">
            <button class="secondary counter-btn" id="btn-minus" ${this.numPlayers <= this.game.minPlayers ? 'disabled' : ''}>-</button>
            <div class="counter-value">${this.numPlayers}</div>
            <button class="secondary counter-btn" id="btn-plus" ${this.numPlayers >= this.game.maxPlayers ? 'disabled' : ''}>+</button>
          </div>
          
          <div class="players-list">
            ${this.playerNames.map((name, i) => {
              let colorIndicator = '';
              if (this.game.config && this.game.config.colors && this.game.config.colors[i]) {
                const color = this.game.config.colors[i];
                // Extract base color without transparency if it's rgba, or just use as is
                let displayColor = color;
                if (color.startsWith('rgba')) {
                   // Optional: We can just use the rgba color directly, since the background is dark.
                   // The 0.5 opacity will make it a bit muted, which is fine, or we can replace the alpha channel to 1 for the indicator
                   displayColor = color.replace(/[\d\.]+\)$/g, '1)');
                }
                colorIndicator = `<div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${displayColor}; border: 2px solid #000; outline: 2px solid #fff; flex-shrink: 0; margin: 2px;"></div>`;
              }
              return `
              <div class="player-input-row">
                <div class="player-number">${i + 1}.</div>
                ${colorIndicator}
                <div class="input-wrapper typeahead-container">
                  <input type="text" id="player-input-${i}" value="${name}" placeholder="${t('name_placeholder')}" autocomplete="off" />
                  <div id="typeahead-${i}"></div>
                </div>
                ${this.numPlayers > this.game.minPlayers ? `<button class="remove-player-btn" id="btn-remove-${i}" title="Remove player" tabindex="-1">✕</button>` : ''}
              </div>
            `}).join('')}
          </div>
        </div>
        
        <div class="actions">
          <button class="secondary" id="btn-back">← Back</button>
          <button class="primary" id="btn-start">${t('start_game')} →</button>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById('btn-minus').onclick = () => this.updatePlayerCount(-1);
    this.shadowRoot.getElementById('btn-plus').onclick = () => this.updatePlayerCount(1);
    this.shadowRoot.getElementById('btn-back').onclick = () => location.hash = '';
    this.shadowRoot.getElementById('btn-start').onclick = () => this.startGame();

    // Attach input and remove listeners
    this.playerNames.forEach((_, i) => {
      const removeBtn = this.shadowRoot.getElementById(`btn-remove-${i}`);
      if (removeBtn) {
        removeBtn.onclick = () => this.removePlayer(i);
      }

      const input = this.shadowRoot.getElementById(`player-input-${i}`);
      input.addEventListener('input', (e) => this.handleNameInput(i, e.target.value));
      // Close typeahead on blur with small delay
      input.addEventListener('blur', () => {
        setTimeout(() => {
          const container = this.shadowRoot.getElementById(`typeahead-${i}`);
          if (container) container.innerHTML = '';
        }, 200);
      });
    });
  }
}

customElements.define('player-setup', PlayerSetup);
