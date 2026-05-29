import { getValue, saveValue } from '../../storage.service.js';
import { t } from '../../ui.i18n.service.js';
import { showConfirm } from '../../modal.service.js';

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
    this.players[playerIdx].score += change;
    saveValue('players', this.players);
    
    // Update display
    const scoreEl = this.shadowRoot.getElementById(`score-${playerIdx}`);
    if (scoreEl) {
      scoreEl.textContent = this.players[playerIdx].score;
      this.bounce(scoreEl);
    }
    
    this.spawnFloatingNumber(playerIdx, change, x, y);
    if (navigator.vibrate) navigator.vibrate(change > 0 ? 10 : 30);
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
    
    // Calculate grid template based on player count
    let gridTemplate = '1fr';
    if (numPlayers === 2) gridTemplate = '1fr 1fr';
    else if (numPlayers === 3 || numPlayers === 4) gridTemplate = '1fr 1fr';
    
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
          grid-template-rows: ${numPlayers <= 2 ? gridTemplate : 'auto'};
          grid-template-columns: ${numPlayers > 2 ? gridTemplate : '1fr'};
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #000;
        }
        
        .player-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(135deg, var(--bg-color), rgba(15, 23, 42, 0.9));
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
        
        .player-name {
          font-size: 1.5rem;
          opacity: 0.6;
          z-index: 2;
          pointer-events: none;
          margin-bottom: 1rem;
        }
        
        .tap-zone {
          position: absolute;
          width: 100%;
          height: 50%;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .tap-zone:active {
          background: rgba(255, 255, 255, 0.05);
          opacity: 1;
        }
        
        .tap-zone.top {
          top: 0;
          align-items: flex-start;
          padding-top: 2rem;
          font-size: 2rem;
          color: var(--accent-color);
        }
        
        .tap-zone.bottom {
          bottom: 0;
          align-items: flex-end;
          padding-bottom: 2rem;
          font-size: 2rem;
          color: var(--danger-color);
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
            <div class="tap-zone top" data-player="${i}" data-val="1">+</div>
            <div class="player-name">${p.name}</div>
            <div class="score-display" id="score-${i}">${p.score}</div>
            <div class="tap-zone bottom" data-player="${i}" data-val="-1">-</div>
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
