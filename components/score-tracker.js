class ScoreTracker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.players = JSON.parse(localStorage.getItem('players') || '[]');
    this.game = localStorage.getItem('game');
    this.render();
  }

  addScore(index) {
    const input = this.shadowRoot.querySelector(`#input-${index}`);
    const value = parseInt(input.value);
    if (!isNaN(value)) {
      this.players[index].score += value;
      localStorage.setItem('players', JSON.stringify(this.players));
      this.checkEnd();
      this.render();
    }
  }

  getTargetScore() {
    const count = this.players.length;
    if (this.game === 'flip7') return 200;
    if (this.game === 'ssp') return count === 2 ? 40 : count === 3 ? 35 : 30;
    return 999;
  }

  checkEnd() {
    const target = this.getTargetScore();
    const winner = this.players.find(p => p.score >= target);
    if (winner) {
      alert(`${winner.name} переміг!`);
      location.hash = 'player-setup';
    }
  }

  render() {
    const list = this.players.map((p, i) => `
      <div>
        <strong>${p.name}:</strong> ${p.score} балів
        <input type="number" id="input-${i}" />
        <button onclick="this.getRootNode().host.addScore(${i})">Додати</button>
      </div>
    `).join('');
    this.shadowRoot.innerHTML = `
      <div>
        <h2>Підрахунок балів</h2>
        ${list}
      </div>
    `;
  }
}

customElements.define('score-tracker', ScoreTracker);