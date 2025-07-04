import { saveValue } from "../../storage.service.js";

class GameSelect extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const [htmlText, cssText, baseText] = await Promise.all([
      fetch('/components/game-select/game-select.html').then(res => res.text()),
      fetch('/components/game-select/game-select.css').then(res => res.text()),
      fetch('/style.css').then(res => res.text())
    ]);

    const template = document.createElement('template');
    template.innerHTML = `<style>${baseText + cssText}</style>` + htmlText;
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById('flip').onclick = () => this.selectGame('flip7');
    this.shadowRoot.getElementById('ssp').onclick = () => this.selectGame('ssp');
  }

  selectGame(game) {
    saveValue('game', game);
    location.hash = 'score-tracker';
  }
}

customElements.define('game-select', GameSelect);