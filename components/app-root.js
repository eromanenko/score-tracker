import './player-setup.js';
import './game-select.js';
import './score-tracker.js';

class AppRoot extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.routeTo('player-setup');
    window.addEventListener('hashchange', () => {
      const page = location.hash.slice(1);
      this.routeTo(page || 'player-setup');
    });
  }

  routeTo(page) {
    this.shadowRoot.innerHTML = `<${page}></${page}>`;
  }
}

customElements.define('app-root', AppRoot);