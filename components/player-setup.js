class PlayerSetup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  addPlayer() {
    const input = this.shadowRoot.querySelector('input');
    const name = input.value.trim();
    if (name) {
      const players = JSON.parse(localStorage.getItem('players') || '[]');
      players.push({ name, score: 0 });
      localStorage.setItem('players', JSON.stringify(players));
      input.value = '';
      this.renderList();
    }
  }

  renderList() {
    const players = JSON.parse(localStorage.getItem('players') || '[]');
    const ul = this.shadowRoot.querySelector('ul');
    ul.innerHTML = players.map(p => `<li>${p.name}</li>`).join('');
  }

  startGame() {
    location.hash = 'game-select';
  }

  render() {
    this.shadowRoot.innerHTML = `
      <div>
        <h2>Додати гравців</h2>
        <input type="text" placeholder="Ім’я гравця" />
        <button onclick="this.getRootNode().host.addPlayer()">Додати</button>
        <ul></ul>
        <button onclick="this.getRootNode().host.startGame()">Далі</button>
      </div>
    `;
    this.renderList();
  }
}

customElements.define('player-setup', PlayerSetup);