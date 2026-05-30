import { getValue, saveValue } from '../../storage.service.js';
import { t } from '../../ui.i18n.service.js';
import { showConfirm, showAlert } from '../../modal.service.js';

class TrackerScorer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.game = getValue('selected_game');
    this.players = getValue('players');
    
    // Initialize start scores if this is the first time loading
    const startScore = this.game.config.startScore || 0;
    let initialized = false;
    this.players.forEach(p => {
      if (p.score === 0 && startScore !== 0 && !p.history.length) {
        p.score = startScore;
        initialized = true;
      }
    });
    if (initialized) saveValue('players', this.players);

    this.render();
    this.attachListeners();
  }

  updateScore(playerIdx, change, x, y) {
    let newScore = this.players[playerIdx].score + change;
    
    if (this.game.config.minScore !== undefined) {
      newScore = Math.max(this.game.config.minScore, newScore);
    }
    if (this.game.config.maxScore !== undefined) {
      newScore = Math.min(this.game.config.maxScore, newScore);
    }
    
    const actualChange = newScore - this.players[playerIdx].score;
    if (actualChange === 0) return; // No change happened

    this.players[playerIdx].score = newScore;
    saveValue('players', this.players);
    
    // Update display
    const scoreEl = this.shadowRoot.getElementById(`score-${playerIdx}`);
    if (scoreEl) {
      scoreEl.textContent = this.players[playerIdx].score;
      this.bounce(scoreEl);
    }
    
    this.spawnFloatingNumber(playerIdx, actualChange, x, y);
    if (navigator.vibrate) navigator.vibrate(actualChange > 0 ? 10 : 30);
    
    this.checkEndCondition();
  }

  checkEndCondition() {
    if (this.game.config.winCondition === 'last_standing') {
      const minScore = this.game.config.minScore !== undefined ? this.game.config.minScore : 0;
      const alivePlayers = this.players.filter(p => p.score > minScore);
      
      if (alivePlayers.length === 1) {
        setTimeout(() => showAlert(t('winner'), alivePlayers[0].name), 500);
      } else if (alivePlayers.length === 0) {
        setTimeout(() => showAlert('Game Over', 'Draw!'), 500);
      }
    } else if (this.game.config.winCondition === 'first_to_max') {
      const maxScore = this.game.config.maxScore;
      if (maxScore !== undefined) {
        const winners = this.players.filter(p => p.score >= maxScore);
        if (winners.length > 0) {
          setTimeout(() => showAlert(t('winner'), winners[0].name), 500);
        }
      }
    }
  }

  spawnFloatingNumber(playerIdx, change, x, y) {
    const panel = this.shadowRoot.getElementById(`panel-${playerIdx}`);
    if (!panel) return;
    
    const floater = document.createElement('div');
    floater.className = `floater ${change > 0 ? 'positive' : 'negative'}`;
    floater.textContent = change > 0 ? `+${change}` : change;
    
    floater.style.left = `${x}px`;
    floater.style.top = `${y}px`;
    
    panel.appendChild(floater);
    
    setTimeout(() => {
      if(panel.contains(floater)) panel.removeChild(floater);
    }, 800);
  }

  bounce(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 100);
  }

  attachListeners() {
    this.shadowRoot.querySelectorAll('.tap-zone').forEach(zone => {
      zone.addEventListener('pointerdown', (e) => {
        const playerIdx = parseInt(zone.getAttribute('data-player'), 10);
        const change = parseInt(zone.getAttribute('data-val'), 10);
        
        const panel = this.shadowRoot.getElementById(`panel-${playerIdx}`);
        const rect = panel.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        this.updateScore(playerIdx, change, localX, localY);
      });
    });

    this.shadowRoot.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const playerIdx = parseInt(btn.getAttribute('data-player'), 10);
        const change = parseInt(btn.getAttribute('data-val'), 10);
        
        const panel = this.shadowRoot.getElementById(`panel-${playerIdx}`);
        const rect = panel.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        this.updateScore(playerIdx, change, localX, localY);
      });
    });

    this.shadowRoot.getElementById('btn-back').onclick = async () => {
      const confirm = await showConfirm(t('new_game'), t('confirm_new_game', {}, 'Are you sure you want to end this game?'));
      if (confirm) location.hash = 'game-select';
    };
    
    this.shadowRoot.getElementById('btn-restart').onclick = async () => {
      const confirm = await showConfirm(t('play_again'), t('confirm_play_again', {}, 'Are you sure you want to reset the scores?'));
      if (confirm) {
        const startScore = this.game.config.startScore || 0;
        this.players.forEach(p => {
          p.score = startScore;
          p.history = [];
        });
        saveValue('players', this.players);
        this.players.forEach((p, i) => {
          const scoreEl = this.shadowRoot.getElementById(`score-${i}`);
          if (scoreEl) {
            scoreEl.textContent = p.score;
            this.bounce(scoreEl);
          }
        });
      }
    };
  }

  render() {
    const baseStyle = document.querySelector('link[href="./style.css"]');
    const baseStyleHref = baseStyle ? baseStyle.href : '../../style.css';
    const numPlayers = this.players.length;
    
    // Support either exact buttons list or quickButtons pairs
    const configBtns = this.game.config.buttons || this.game.config.quickButtons || [];
    const topButtons = configBtns.filter(b => b > 0);
    const bottomButtons = configBtns.filter(b => b < 0);
    
    // Calculate grid template based on player count
    let gridCols = '1fr';
    let gridRows = '1fr';

    if (numPlayers === 2) {
      gridCols = '1fr';
      gridRows = '1fr 1fr';
    } else if (numPlayers === 3 || numPlayers === 4) {
      gridCols = '1fr 1fr';
      gridRows = '1fr 1fr';
    } else if (numPlayers === 5 || numPlayers === 6) {
      gridCols = '1fr 1fr';
      gridRows = '1fr 1fr 1fr';
    } else if (numPlayers > 6) {
      gridCols = '1fr 1fr';
      gridRows = `repeat(${Math.ceil(numPlayers / 2)}, 1fr)`;
    }
    
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

        .tracker-container {
          display: grid;
          grid-template-rows: ${gridRows};
          grid-template-columns: ${gridCols};
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg-color);
        }
        
        .player-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--surface-border);
          background: linear-gradient(135deg, var(--bg-color), var(--panel-gradient-end));
          user-select: none;
          touch-action: none;
        }
        
        /* If 2 players, flip the top one upside down for tabletop play */
        .tracker-container.players-2 .player-panel:first-child {
          transform: rotate(180deg);
        }
        
        .score-display {
          font-size: 8rem;
          font-weight: 800;
          z-index: 2;
          pointer-events: none;
          transition: transform 0.1s;
        }
        
        .score-display.bump {
          transform: scale(1.15);
        }
        
        .side-info {
          position: absolute;
          left: 1rem;
          top: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 0;
          z-index: 2;
          pointer-events: none;
        }
        
        .side-plus {
          font-size: 2.5rem;
          font-weight: bold;
          color: var(--accent-color);
        }
        
        .side-minus {
          font-size: 2.5rem;
          font-weight: bold;
          color: var(--danger-color);
        }
        
        .player-name {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-size: 1.2rem;
          opacity: 0.6;
          white-space: nowrap;
          letter-spacing: 0.1em;
        }
        
        .tap-zone {
          position: absolute;
          width: 100%;
          height: 50%;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        
        .tap-zone:active {
          background: rgba(255, 255, 255, 0.1) !important;
        }
        
        .tap-zone.top {
          top: 0;
          background: linear-gradient(to bottom, rgba(16, 185, 129, 0.08), transparent);
        }
        
        .tap-zone.bottom {
          bottom: 0;
          background: linear-gradient(to top, rgba(239, 68, 68, 0.08), transparent);
        }
        
        .quick-buttons {
          display: flex;
          justify-content: center;
          gap: 1rem;
          z-index: 5;
          margin: 0.5rem 0;
        }
        
        .quick-btn {
          background: var(--surface-color);
          backdrop-filter: blur(4px);
          border: 1px solid var(--surface-border);
          color: var(--text-primary);
          font-weight: bold;
          font-size: 1.2rem;
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        
        .quick-btn:active {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(0.9);
        }
        
        /* Responsive scaling for 5+ players (3+ rows) */
        .tracker-container.players-5 .score-display,
        .tracker-container.players-6 .score-display,
        .tracker-container.players-7 .score-display,
        .tracker-container.players-8 .score-display {
          font-size: 5rem;
        }
        
        .tracker-container.players-5 .quick-btn,
        .tracker-container.players-6 .quick-btn,
        .tracker-container.players-7 .quick-btn,
        .tracker-container.players-8 .quick-btn {
          width: 2.8rem;
          height: 2.8rem;
          font-size: 1rem;
        }
        
        .tracker-container.players-5 .quick-buttons,
        .tracker-container.players-6 .quick-buttons,
        .tracker-container.players-7 .quick-buttons,
        .tracker-container.players-8 .quick-buttons {
          margin: 0.25rem 0;
          gap: 0.5rem;
        }
        
        .tracker-container.players-5 .side-info,
        .tracker-container.players-6 .side-info,
        .tracker-container.players-7 .side-info,
        .tracker-container.players-8 .side-info {
          left: 0.5rem;
          padding: 1rem 0;
        }
        
        .tracker-container.players-5 .side-plus,
        .tracker-container.players-6 .side-plus,
        .tracker-container.players-7 .side-plus,
        .tracker-container.players-8 .side-plus,
        .tracker-container.players-5 .side-minus,
        .tracker-container.players-6 .side-minus,
        .tracker-container.players-7 .side-minus,
        .tracker-container.players-8 .side-minus {
          font-size: 2rem;
        }
        
        .tracker-container.players-5 .player-name,
        .tracker-container.players-6 .player-name,
        .tracker-container.players-7 .player-name,
        .tracker-container.players-8 .player-name {
          font-size: 1rem;
        }
        
        .floater {
          position: absolute;
          font-size: 3rem;
          font-weight: bold;
          pointer-events: none;
          z-index: 10;
          animation: floatUp 0.8s ease-out forwards;
          transform: translate(-50%, -50%);
        }
        
        .floater.positive { color: var(--accent-color); }
        .floater.negative { color: var(--danger-color); }
        
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
        }
        
        .menu-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 20;
          display: flex;
          gap: 1rem;
        }
        
        .menu-btn {
          background: var(--surface-color);
          backdrop-filter: blur(10px);
          border-radius: 50%;
          width: 3.5rem;
          height: 3.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--surface-border);
          padding: 0;
          font-size: 1.5rem;
          cursor: pointer;
        }
      </style>
      
      <div class="tracker-container players-${numPlayers}">
        ${this.players.map((p, i) => `
          <div class="player-panel" id="panel-${i}">
            <div class="tap-zone top" data-player="${i}" data-val="1"></div>
            
            <div class="side-info">
              <div class="side-plus">+</div>
              <div class="player-name">${p.name}</div>
              <div class="side-minus">-</div>
            </div>
            
            ${topButtons.length > 0 ? `
              <div class="quick-buttons">
                ${topButtons.map(val => `<button class="quick-btn" data-player="${i}" data-val="${val}">+${val}</button>`).join('')}
              </div>
            ` : ''}
            <div class="score-display" id="score-${i}">${p.score}</div>
            ${bottomButtons.length > 0 ? `
              <div class="quick-buttons">
                ${bottomButtons.map(val => `<button class="quick-btn" data-player="${i}" data-val="${val}">${val}</button>`).join('')}
              </div>
            ` : ''}
            <div class="tap-zone bottom" data-player="${i}" data-val="-1"></div>
          </div>
        `).join('')}
        
        <div class="menu-container">
          <button class="menu-btn" id="btn-back" title="${t('new_game')}">🏠</button>
          <button class="menu-btn" id="btn-restart" title="${t('play_again')}">🔄</button>
        </div>
      </div>
    `;
  }
}

customElements.define('tracker-scorer', TrackerScorer);
