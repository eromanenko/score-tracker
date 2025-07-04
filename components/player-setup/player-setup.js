import {getValue, saveValue} from '../../storage.service.js';

class PlayerSetup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const [htmlText, cssText, baseText] = await Promise.all([
      fetch('./components/player-setup/player-setup.html').then(res => res.text()),
      fetch('./components/player-setup/player-setup.css').then(res => res.text()),
      fetch('./style.css').then(res => res.text())
    ]);

    const template = document.createElement('template');
    template.innerHTML = `<style>${baseText + cssText}</style>` + htmlText;

    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById('add-btn').onclick = () => this.addPlayer();
    this.shadowRoot.getElementById('start-btn').onclick = () => this.startGame();

    this.renderList();
  }

  addPlayer() {
    const input = this.shadowRoot.querySelector('input');
    const name = input.value.trim();
    if (name) {
      const players = getValue('players') || [];
      players.push({ name, score: 0 });
      saveValue('players', players);
      input.value = '';
      this.renderList();
    }
  }

  renderList() {
    const players = getValue('players') || [];
    const ul = this.shadowRoot.querySelector('ul');
    if (ul) {
      ul.innerHTML = players.map(p => `<li>${p.name}</li>`).join('');
    }
  }

  startGame() {
    location.hash = 'game-select';
  }
}

customElements.define('player-setup', PlayerSetup);
