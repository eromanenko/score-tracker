class GameSelect extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <div>
        <h2>Оберіть гру</h2>
        <button onclick="this.getRootNode().host.selectGame('flip7')">Flip 7</button>
        <button onclick="this.getRootNode().host.selectGame('ssp')">Sea, Salt & Paper</button>
      </div>
    `;
  }

  selectGame(game) {
    localStorage.setItem('game', game);
    location.hash = 'score-tracker';
  }
}

customElements.define('game-select', GameSelect);