import { loadGames, saveValue, getValue, getFilterMode, getDisabledGames, toggleGameDisabled, deleteCustomGame } from '../../storage.service.js';
import { showConfirm, showToast } from '../../modal.service.js';
import { t, getLanguage } from '../../ui.i18n.service.js';

class GameSelect extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.games = [];
  }

  async connectedCallback() {
    this._filterListener = () => this.render();
    window.addEventListener('filter-changed', this._filterListener);
    this.games = await loadGames();
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener('filter-changed', this._filterListener);
  }

  selectGame(game) {
    saveValue('selected_game', game);
    // Move to player setup
    location.hash = 'player-setup';
  }

  render() {
    const baseStyle = document.querySelector('link[href="./style.css"]');
    const baseStyleHref = baseStyle ? baseStyle.href : '../../style.css';

    const lang = getLanguage().toUpperCase();
    const filterMode = getFilterMode();
    const disabledGames = getDisabledGames();
    
    let visibleGames = this.games;
    if (filterMode === 'selected') {
      visibleGames = this.games.filter(g => !disabledGames.includes(g.id));
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
        
        .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .game-card {
          padding: 1.5rem;
          cursor: pointer;
          transition: var(--transition-smooth);
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
        }
        
        .game-card.disabled {
          opacity: 0.4;
          filter: grayscale(1);
        }
        
        .game-card:hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--primary-color);
        }
        
        .game-checkbox {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          z-index: 2;
        }
        
        .game-checkbox input {
          width: 1.5rem;
          height: 1.5rem;
          cursor: pointer;
          accent-color: var(--primary-color);
        }
        
        .game-delete {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          z-index: 2;
          background: rgba(255, 0, 0, 0.2);
          border: none;
          color: white;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          transition: var(--transition-smooth);
        }
        
        .game-delete:hover {
          background: rgba(255, 0, 0, 0.8);
        }

        .game-edit {
          position: absolute;
          top: 0.5rem;
          left: 2.5rem;
          z-index: 2;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          transition: var(--transition-smooth);
        }

        .game-edit:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        .add-game-card {
          justify-content: center;
          flex-direction: column;
          border: 2px dashed var(--surface-border);
          background: transparent;
        }
        
        .add-game-card:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        
        .game-icon {
          font-size: 2.5rem;
          width: 3rem;
          height: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .game-icon img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        .game-info h3 {
          margin-bottom: 0.25rem;
        }
        
        .game-info p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        
        header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(to right, var(--primary-color), var(--accent-color));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      </style>
      
      <div class="container fade-in">
        <header>
          <h1>${t('select_game')}</h1>
        </header>
        
        <div class="games-grid">
          ${visibleGames.map(game => {
            const isDisabled = disabledGames.includes(game.id);
            return `
            <div class="game-card glass-panel ${filterMode === 'all' && isDisabled ? 'disabled' : ''}" data-id="${game.id}">
              ${filterMode === 'all' && game.isCustom ? `
                <button class="game-delete" data-delete="${game.id}" title="${t('delete')}">✕</button>
                <button class="game-edit" data-edit="${game.id}" title="${t('edit', {}, 'Edit')}">✏️</button>
              ` : ''}
              ${filterMode === 'all' ? `
                <div class="game-checkbox" data-checkbox="${game.id}">
                  <input type="checkbox" ${!isDisabled ? 'checked' : ''}>
                </div>
              ` : ''}
              <div class="game-icon">${
                game.iconUrl && game.iconUrl.startsWith('./') ? `<img src="${game.iconUrl}" alt="${game.id}">` : (game.iconUrl || '🎲')
              }</div>
              <div class="game-info">
                <h3>${game['name' + lang] || game.nameEN || game.id}</h3>
                <p>${game.minPlayers}-${game.maxPlayers} players</p>
              </div>
            </div>
          `}).join('')}
          ${filterMode === 'all' ? `
            <div class="game-card glass-panel add-game-card" id="btn-add-game">
              <div class="game-icon" style="font-size: 2rem;">➕</div>
              <div class="game-info" style="text-align: center; margin-top: 0.5rem;">
                <h3 style="margin: 0;">${t('add_game', {}, 'Add Game')}</h3>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      <!-- Game Builder Modal Container -->
      <div id="builder-container"></div>
    `;

    this.shadowRoot.querySelectorAll('.game-checkbox input').forEach(chk => {
      chk.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameId = chk.closest('.game-checkbox').getAttribute('data-checkbox');
        toggleGameDisabled(gameId);
        const card = chk.closest('.game-card');
        card.classList.toggle('disabled');
      });
    });

    this.shadowRoot.querySelectorAll('.game-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const gameId = btn.getAttribute('data-delete');
        const confirm = await showConfirm(t('delete_game', {}, 'Delete Game'), t('delete_game_confirm', {}, 'Are you sure you want to permanently delete this game?'));
        if (confirm) {
          await deleteCustomGame(gameId);
          this.games = await loadGames();
          this.render();
          showToast(t('game_deleted', {}, 'Game deleted'));
        }
      });
    });

    this.shadowRoot.querySelectorAll('.game-edit').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const gameId = btn.getAttribute('data-edit');
        const game = this.games.find(g => g.id === gameId);
        import('../game-builder/game-builder.js').then(() => {
          const container = this.shadowRoot.getElementById('builder-container');
          container.innerHTML = '<game-builder></game-builder>';
          const builder = container.querySelector('game-builder');
          builder.loadExistingGame(game);
          builder.addEventListener('close', () => {
            container.innerHTML = '';
          });
          builder.addEventListener('game-saved', async () => {
            container.innerHTML = '';
            this.games = await loadGames();
            this.render();
            showToast(t('game_saved', {}, 'Game successfully saved!'));
          });
        });
      });
    });

    this.shadowRoot.querySelectorAll('.game-card:not(.add-game-card)').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent selecting if we clicked the checkbox or delete/edit button
        if (e.target.tagName === 'INPUT' || e.target.classList.contains('game-delete') || e.target.classList.contains('game-edit')) return;
        
        const gameId = card.getAttribute('data-id');
        const game = this.games.find(g => g.id === gameId);
        this.selectGame(game);
      });
    });

    const btnAddGame = this.shadowRoot.getElementById('btn-add-game');
    if (btnAddGame) {
      btnAddGame.addEventListener('click', () => {
        import('../game-builder/game-builder.js').then(() => {
          const container = this.shadowRoot.getElementById('builder-container');
          container.innerHTML = '<game-builder></game-builder>';
          const builder = container.querySelector('game-builder');
          builder.addEventListener('close', () => {
            container.innerHTML = '';
          });
          builder.addEventListener('game-saved', async () => {
            container.innerHTML = '';
            this.games = await loadGames();
            this.render();
            showToast(t('game_saved', {}, 'Game successfully saved!'));
          });
        });
      });
    }
  }
}

customElements.define('game-select', GameSelect);