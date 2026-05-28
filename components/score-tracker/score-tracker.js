import { getValue, saveValue, loadGameBundle } from '../../storage.service.js';
import { t } from '../../ui.i18n.service.js';

// Dynamically import scorers so they register their custom elements
import '../scorers/category-scorer.js';
import '../scorers/cumulative-scorer.js';
import '../scorers/tracker-scorer.js';

class ScoreBoard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    let game = getValue('selected_game');
    if (!game) {
      location.hash = '';
      return;
    }

    // Show loading state
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; justify-content: center; align-items: center; height: 100vh; color: white; }
      </style>
      <div><h2>${t('loading')}</h2></div>
    `;

    // Load bundle
    const config = await loadGameBundle(game);
    if (!config) {
      this.shadowRoot.innerHTML = `<div>Error loading game bundle.</div>`;
      return;
    }
    
    game.config = config;
    saveValue('selected_game', game);

    let scorerTag = '';
    switch (game.scoringType) {
      case 'category':
        scorerTag = '<category-scorer></category-scorer>';
        break;
      case 'cumulative':
        scorerTag = '<cumulative-scorer></cumulative-scorer>';
        break;
      case 'tracker':
        scorerTag = '<tracker-scorer></tracker-scorer>';
        break;
      default:
        scorerTag = '<div>Unknown game type</div>';
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
      </style>
      ${scorerTag}
    `;
  }
}

customElements.define('score-board', ScoreBoard);