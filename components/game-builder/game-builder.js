import { t, getLanguage } from '../../ui.i18n.service.js';
import { saveCustomGame, getDbValue } from '../../storage.service.js';

class GameBuilder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.resetState();
  }

  resetState() {
    this.meta = {
      id: '',
      nameEN: '',
      nameUK: '',
      nameRU: '',
      minPlayers: 1,
      maxPlayers: 6,
      scoringType: 'category',
      iconUrl: '🎲'
    };
    this.config = {
      categories: [],
      winCondition: 'highest',
      targetScore: 100,
      startScore: 0
    };
    this.assets = {}; // fileName -> arrayBuffer
    this.blobs = {};  // fileName -> blobUrl
  }

  connectedCallback() {
    this.render();
  }

  close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  async handleZipUpload(file) {
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const configFile = zip.file("config.json");
      if (!configFile) {
        alert("Invalid archive: config.json not found.");
        return;
      }
      const configStr = await configFile.async("string");
      this.config = JSON.parse(configStr);

      // Try to parse meta if user uploads a ready zip. We can't know meta fully from config.json,
      // but maybe we prompt user or just leave it for them to fill.
      // We will clear existing assets and load from zip
      this.assets = {};
      this.blobs = {};

      for (let relativePath in zip.files) {
        const zipEntry = zip.files[relativePath];
        if (!zipEntry.dir && /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(relativePath)) {
          const ab = await zipEntry.async("arraybuffer");
          this.assets[relativePath] = ab;

          let mimeType = "image/png";
          if (relativePath.toLowerCase().endsWith(".svg")) mimeType = "image/svg+xml";
          const blob = new Blob([ab], { type: mimeType });
          this.blobs[relativePath] = URL.createObjectURL(blob);
        }
      }

      if (!this.config.categories) this.config.categories = [];
      this.meta.scoringType = this.config.categories.length > 0 ? 'category' : (this.config.targetScore ? 'cumulative' : 'tracker');

      this.render();
    } catch (e) {
      console.error(e);
      alert("Error reading zip archive.");
    }
  }

  async loadExistingGame(gameMeta) {
    this.meta = {
      id: gameMeta.id || '',
      nameEN: gameMeta.nameEN || '',
      nameUK: gameMeta.nameUK || '',
      nameRU: gameMeta.nameRU || '',
      minPlayers: gameMeta.minPlayers || 1,
      maxPlayers: gameMeta.maxPlayers || 6,
      scoringType: gameMeta.scoringType || 'category',
      iconUrl: gameMeta.iconUrl || '🎲'
    };

    try {
      const arrayBuffer = await getDbValue(`bundle_${gameMeta.id}`);
      if (arrayBuffer) {
        // Mock a file-like object to use existing handleZipUpload logic, 
        // or just parse the arrayBuffer directly
        const zip = await JSZip.loadAsync(arrayBuffer);
        const configFile = zip.file("config.json");
        if (configFile) {
          const configStr = await configFile.async("string");
          this.config = JSON.parse(configStr);
        }

        this.assets = {};
        this.blobs = {};

        for (let relativePath in zip.files) {
          const zipEntry = zip.files[relativePath];
          if (!zipEntry.dir && /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(relativePath)) {
            const ab = await zipEntry.async("arraybuffer");
            this.assets[relativePath] = ab;
            let mimeType = "image/png";
            if (relativePath.toLowerCase().endsWith(".svg")) mimeType = "image/svg+xml";
            const blob = new Blob([ab], { type: mimeType });
            this.blobs[relativePath] = URL.createObjectURL(blob);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load existing bundle", e);
    }

    this.render();
  }

  async resizeImage(file) {
    return new Promise((resolve, reject) => {
      if (file.type.includes('svg')) {
        // Return directly
        file.arrayBuffer().then(ab => resolve({ arrayBuffer: ab, type: file.type }));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max = 100;
          if (width > max || height > max) {
            if (width > height) {
              height = Math.round((height *= max / width));
              width = max;
            } else {
              width = Math.round((width *= max / height));
              height = max;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => {
            blob.arrayBuffer().then(ab => resolve({ arrayBuffer: ab, type: 'image/png' }));
          }, 'image/png', 0.9);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async handleIconUpload(file, catIndex) {
    if (!file) return;
    try {
      const { arrayBuffer, type } = await this.resizeImage(file);
      const ext = type.includes('svg') ? 'svg' : 'png';
      const fileName = `cat_${Date.now()}.${ext}`;

      this.assets[fileName] = arrayBuffer;
      const blob = new Blob([arrayBuffer], { type });
      this.blobs[fileName] = URL.createObjectURL(blob);

      this.config.categories[catIndex].iconFile = fileName;
      this.render();
    } catch (e) {
      console.error(e);
      alert("Error processing image.");
    }
  }

  addCategory() {
    this.config.categories.push({
      id: `cat_${Date.now()}`,
      nameEN: '',
      nameUK: '',
      nameRU: '',
      hintEN: '',
      hintUK: '',
      hintRU: '',
      color: '',
      categoryType: 'points',
      actionValue: ''
    });
    this.render();
  }

  removeCategory(index) {
    const cat = this.config.categories[index];
    if (cat.iconFile && this.assets[cat.iconFile]) {
      delete this.assets[cat.iconFile];
      delete this.blobs[cat.iconFile];
    }
    this.config.categories.splice(index, 1);
    this.render();
  }

  toHex6(color) {
    if (!color) return '#444444';
    if (color.startsWith('#')) return color.substring(0, 7);
    const rgbaMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
      const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
      const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return '#444444';
  }

  generateSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }

  async buildZip() {
    const zip = new JSZip();
    // Build final config
    const finalConfig = {};
    if (this.meta.scoringType === 'category') {
      finalConfig.categories = this.config.categories;
    } else if (this.meta.scoringType === 'cumulative') {
      finalConfig.winCondition = this.config.winCondition;
      finalConfig.targetScore = Number(this.config.targetScore);
    } else if (this.meta.scoringType === 'tracker') {
      finalConfig.winCondition = this.config.winCondition;
      finalConfig.startScore = Number(this.config.startScore);
    }

    zip.file("config.json", JSON.stringify(finalConfig, null, 2));

    for (let fileName in this.assets) {
      zip.file(fileName, this.assets[fileName]);
    }

    return await zip.generateAsync({ type: "arraybuffer" });
  }

  async saveGame() {
    if (!this.meta.nameEN) {
      alert("English name is required!");
      return;
    }
    if (!this.meta.id) {
      this.meta.id = this.generateSlug(this.meta.nameEN);
    }
    if (!this.meta.id) this.meta.id = `custom_${Date.now()}`;

    const zipBuffer = await this.buildZip();

    const gameMeta = {
      id: this.meta.id,
      nameEN: this.meta.nameEN,
      nameUK: this.meta.nameUK,
      nameRU: this.meta.nameRU,
      minPlayers: Number(this.meta.minPlayers),
      maxPlayers: Number(this.meta.maxPlayers),
      scoringType: this.meta.scoringType,
      iconUrl: this.meta.iconUrl
    };

    await saveCustomGame(gameMeta, zipBuffer);
    this.dispatchEvent(new CustomEvent('game-saved'));
  }

  async downloadGame() {
    if (!this.meta.nameEN) {
      alert("English name is required before downloading!");
      return;
    }
    const zipBuffer = await this.buildZip();
    const blob = new Blob([zipBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = this.meta.id || this.generateSlug(this.meta.nameEN) || 'custom-game';
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  updateMeta(field, value) {
    this.meta[field] = value;
    if (field === 'scoringType') this.render();
    else this.updateValidationUI();
  }

  updateConfig(field, value) {
    this.config[field] = value;
    this.updateValidationUI();
  }

  updateCategory(index, field, value) {
    this.config.categories[index][field] = value;
    if (field === 'categoryType') this.render();
    else this.updateValidationUI();
  }

  updateValidationUI() {
    let allCatsValid = true;
    if (this.meta.scoringType === 'category') {
      const cards = this.shadowRoot.querySelectorAll('.category-card');
      if (this.config.categories.length === 0) {
        allCatsValid = false;
      } else {
        this.config.categories.forEach((cat, idx) => {
          const hasIdentity = (cat.nameEN && cat.nameEN.trim().length > 0) || cat.iconFile || cat.color;
          const cType = cat.categoryType || 'points';
          const hasValue = cType === 'points' || (cat.actionValue !== undefined && cat.actionValue !== null && String(cat.actionValue).trim() !== '');
          const isCatValid = hasIdentity && hasValue;

          if (!isCatValid) {
            allCatsValid = false;
          }

          // Update visual state for this category
          if (cards[idx]) {
            if (isCatValid) {
              cards[idx].classList.remove('invalid-category');
            } else {
              cards[idx].classList.add('invalid-category');
            }
          }
        });
      }
    }

    const isValid = this.meta.nameEN.trim().length > 0 && allCatsValid;
    let errorMsg = '';
    if (this.meta.nameEN.trim().length === 0) {
      errorMsg = 'Game Name (EN) is required';
    } else if (!allCatsValid) {
      errorMsg = 'Some categories are invalid (missing identity or action value)';
    }

    const btnSave = this.shadowRoot.getElementById('btn-save');
    const btnDownload = this.shadowRoot.getElementById('btn-download');

    if (btnSave && btnDownload) {
      if (isValid) {
        btnSave.removeAttribute('disabled');
        btnDownload.removeAttribute('disabled');
        btnSave.title = '';
        btnDownload.title = '';
      } else {
        btnSave.setAttribute('disabled', 'true');
        btnDownload.setAttribute('disabled', 'true');
        btnSave.title = errorMsg;
        btnDownload.title = errorMsg;
      }
    }
  }

  render() {
    const existingModal = this.shadowRoot.getElementById('modal');
    const savedScrollTop = existingModal ? existingModal.scrollTop : 0;

    const baseStyle = document.querySelector('link[href="./style.css"]');
    const baseStyleHref = baseStyle ? baseStyle.href : '../../style.css';

    this.shadowRoot.innerHTML = `
      <style>
        @import url('${baseStyleHref}');
        .overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .modal {
          background: var(--bg-color);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--surface-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          background: var(--bg-color);
          z-index: 10;
        }
        .modal-body {
          padding: 1.5rem;
          flex: 1;
        }
        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--surface-border);
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          position: sticky;
          bottom: 0;
          background: var(--bg-color);
          z-index: 10;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        input, select {
          width: 100%;
          padding: 0.5rem;
          background: var(--input-bg);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }
        .category-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--surface-border);
          padding: 1rem;
          border-radius: var(--radius-sm);
          margin-bottom: 1rem;
          position: relative;
          transition: var(--transition-smooth);
        }
        .invalid-category {
          border-color: var(--danger-color) !important;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.05);
        }
        .btn-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1.5rem;
          cursor: pointer;
        }
        .btn-close:hover {
          color: white;
        }
        .cat-delete {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(255,0,0,0.2);
          border: none;
          color: white;
          width: 2rem; height: 2rem;
          border-radius: 50%;
          cursor: pointer;
        }
        .cat-delete:hover { background: rgba(255,0,0,0.8); }
        .upload-area {
          border: 2px dashed var(--primary-color);
          padding: 1.5rem;
          text-align: center;
          border-radius: var(--radius-sm);
          cursor: pointer;
          margin-bottom: 2rem;
          transition: background 0.2s;
        }
        .upload-area:hover {
          background: rgba(var(--primary-color-rgb), 0.1);
        }
        .icon-preview {
          width: 40px; height: 40px;
          object-fit: contain;
          background: rgba(0,0,0,0.2);
          border-radius: 4px;
        }
      </style>

      <div class="overlay" id="overlay">
        <div class="modal" id="modal" @click.stop>
          <div class="modal-header">
            <h2 style="margin:0">${t('add_game', {}, 'Build Game')}</h2>
            <button class="btn-close" id="btn-close">✕</button>
          </div>
          
          <div class="modal-body">
            <!-- Upload Area -->
            <div class="upload-area" id="upload-zip">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📦</div>
              <div>Upload ready game archive (.zip)</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">or configure manually below</div>
              <input type="file" id="zip-input" accept=".zip" style="display:none">
            </div>

            <h3 style="margin-top: 0; margin-bottom: 1rem;">General Information</h3>
            <div class="grid-3 form-group">
              <div>
                <label>Name (EN)*</label>
                <input type="text" id="m-en" value="${this.meta.nameEN}">
              </div>
              <div>
                <label>Name (UK)</label>
                <input type="text" id="m-uk" value="${this.meta.nameUK}">
              </div>
              <div>
                <label>Name (RU)</label>
                <input type="text" id="m-ru" value="${this.meta.nameRU}">
              </div>
            </div>

            <div class="grid-3 form-group">
              <div>
                <label>Min Players</label>
                <input type="number" id="m-min" value="${this.meta.minPlayers}">
              </div>
              <div>
                <label>Max Players</label>
                <input type="number" id="m-max" value="${this.meta.maxPlayers}">
              </div>
              <div>
                <label>Emoji Icon</label>
                <input type="text" id="m-icon" value="${this.meta.iconUrl}">
              </div>
            </div>

            <div class="form-group">
              <label>Scoring Type</label>
              <select id="m-type">
                <option value="category" ${this.meta.scoringType === 'category' ? 'selected' : ''}>Category (Categories & Points)</option>
                <option value="cumulative" ${this.meta.scoringType === 'cumulative' ? 'selected' : ''}>Cumulative (Rounds & Target Score)</option>
                <option value="tracker" ${this.meta.scoringType === 'tracker' ? 'selected' : ''}>Tracker (Real-time Life/Score Tracker)</option>
              </select>
            </div>

            <hr style="border:0; border-top: 1px solid var(--surface-border); margin: 2rem 0;">

            <h3 style="margin-bottom: 1rem;">Scoring Configuration</h3>
            
            ${this.meta.scoringType === 'category' ? `
              <div id="categories-container">
                ${this.config.categories.map((cat, i) => `
                  <div class="category-card">
                    <button class="cat-delete" data-idx="${i}">✕</button>
                    
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                      <div style="display: flex; gap: 1rem; align-items: center;">
                        <button class="secondary btn-upload-icon" data-idx="${i}">Upload Icon</button>
                        <input type="file" class="file-icon" data-idx="${i}" accept="image/*" style="display:none">
                        ${cat.iconFile && this.blobs[cat.iconFile] ? `<img src="${this.blobs[cat.iconFile]}" class="icon-preview">` : ''}
                      </div>
                      <div style="font-weight: bold; color: var(--text-secondary);">OR</div>
                      <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <label>Color:</label>
                        <input type="color" class="c-color-picker" data-idx="${i}" value="${this.toHex6(cat.color)}" style="width: 40px; padding: 0; cursor: pointer;">
                        ${cat.color ? `<button class="c-color-clear" data-idx="${i}" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.2rem;" title="Clear Color">✕</button>` : `<span style="font-size: 0.8rem; color: var(--text-secondary);">(Not set)</span>`}
                      </div>
                      <div style="font-weight: bold; color: var(--text-secondary);">OR</div>
                    </div>

                    <div class="grid-3 form-group">
                      <div>
                        <label>Name (EN)</label>
                        <input type="text" class="c-en" data-idx="${i}" value="${cat.nameEN || ''}">
                      </div>
                      <div>
                        <label>Name (UK)</label>
                        <input type="text" class="c-uk" data-idx="${i}" value="${cat.nameUK || ''}">
                      </div>
                      <div>
                        <label>Name (RU)</label>
                        <input type="text" class="c-ru" data-idx="${i}" value="${cat.nameRU || ''}">
                      </div>
                    </div>
                    
                    <div class="grid-3 form-group">
                      <div>
                        <label>Hint (EN)</label>
                        <input type="text" class="h-en" data-idx="${i}" value="${cat.hintEN || ''}">
                      </div>
                      <div>
                        <label>Hint (UK)</label>
                        <input type="text" class="h-uk" data-idx="${i}" value="${cat.hintUK || ''}">
                      </div>
                      <div>
                        <label>Hint (RU)</label>
                        <input type="text" class="h-ru" data-idx="${i}" value="${cat.hintRU || ''}">
                      </div>
                    </div>

                    <div class="grid-2 form-group">
                      <div>
                        <label>Type</label>
                        <select class="c-type" data-idx="${i}">
                          <option value="points" ${(cat.categoryType || 'points') === 'points' ? 'selected' : ''}>Points (+)</option>
                          <option value="multiplier" ${cat.categoryType === 'multiplier' ? 'selected' : ''}>Multiplier (x)</option>
                          <option value="divider" ${cat.categoryType === 'divider' ? 'selected' : ''}>Divider (/)</option>
                          <option value="checkbox" ${cat.categoryType === 'checkbox' ? 'selected' : ''}>Checkbox (Toggle)</option>
                          <option value="radio" ${cat.categoryType === 'radio' ? 'selected' : ''}>Radio (Exclusive)</option>
                        </select>
                      </div>
                      <div style="${(cat.categoryType || 'points') === 'points' ? 'display: none;' : ''}">
                        <label>Action Value</label>
                        <input type="number" class="c-val" data-idx="${i}" value="${cat.actionValue !== undefined ? cat.actionValue : ''}">
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
              <button class="secondary" id="btn-add-cat" style="width:100%">+ Add Category</button>
            ` : ''}

            ${this.meta.scoringType === 'cumulative' ? `
              <div class="grid-2 form-group">
                <div>
                  <label>Win Condition</label>
                  <select id="c-win">
                    <option value="highest" ${this.config.winCondition === 'highest' ? 'selected' : ''}>Highest Score Wins</option>
                    <option value="lowest" ${this.config.winCondition === 'lowest' ? 'selected' : ''}>Lowest Score Wins</option>
                  </select>
                </div>
                <div>
                  <label>Target Score (Game Over limit)</label>
                  <input type="number" id="c-target" value="${this.config.targetScore}">
                </div>
              </div>
            ` : ''}

            ${this.meta.scoringType === 'tracker' ? `
              <div class="grid-2 form-group">
                <div>
                  <label>Win Condition</label>
                  <select id="t-win">
                    <option value="highest" ${this.config.winCondition === 'highest' ? 'selected' : ''}>Highest Score Wins</option>
                    <option value="lowest" ${this.config.winCondition === 'lowest' ? 'selected' : ''}>Lowest Score Wins</option>
                    <option value="last_standing" ${this.config.winCondition === 'last_standing' ? 'selected' : ''}>Last Player Standing</option>
                  </select>
                </div>
                <div>
                  <label>Start Score</label>
                  <input type="number" id="t-start" value="${this.config.startScore}">
                </div>
              </div>
            ` : ''}

          </div>
          
          <div class="modal-footer">
            <button class="secondary" id="btn-download">⬇️ Download Zip</button>
            <button class="primary" id="btn-save">💾 Save to App</button>
          </div>
        </div>
      </div>
    `;

    // Listeners
    this.shadowRoot.getElementById('btn-close').onclick = () => this.close();
    this.shadowRoot.getElementById('overlay').onclick = (e) => {
      if (e.target.id === 'overlay') this.close();
    };

    // Zip Upload
    const uploadArea = this.shadowRoot.getElementById('upload-zip');
    const zipInput = this.shadowRoot.getElementById('zip-input');
    uploadArea.onclick = () => zipInput.click();
    zipInput.onchange = (e) => this.handleZipUpload(e.target.files[0]);

    // Meta inputs
    const bindMeta = (id, field) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.oninput = (e) => this.updateMeta(field, e.target.value);
    };
    bindMeta('m-en', 'nameEN');
    bindMeta('m-uk', 'nameUK');
    bindMeta('m-ru', 'nameRU');
    bindMeta('m-min', 'minPlayers');
    bindMeta('m-max', 'maxPlayers');
    bindMeta('m-icon', 'iconUrl');
    bindMeta('m-type', 'scoringType');

    // Config inputs (cumulative/tracker)
    const bindConfig = (id, field) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.oninput = (e) => this.updateConfig(field, e.target.value);
    };
    bindConfig('c-win', 'winCondition');
    bindConfig('c-target', 'targetScore');
    bindConfig('t-win', 'winCondition');
    bindConfig('t-start', 'startScore');

    // Category Buttons
    const btnAddCat = this.shadowRoot.getElementById('btn-add-cat');
    if (btnAddCat) btnAddCat.onclick = () => this.addCategory();

    this.shadowRoot.querySelectorAll('.cat-delete').forEach(btn => {
      btn.onclick = () => this.removeCategory(btn.getAttribute('data-idx'));
    });

    this.shadowRoot.querySelectorAll('.btn-upload-icon').forEach(btn => {
      btn.onclick = () => {
        const idx = btn.getAttribute('data-idx');
        this.shadowRoot.querySelector(`.file-icon[data-idx="${idx}"]`).click();
      };
    });

    this.shadowRoot.querySelectorAll('.file-icon').forEach(input => {
      input.onchange = (e) => {
        this.handleIconUpload(e.target.files[0], input.getAttribute('data-idx'));
      };
    });

    // Category Inputs
    const bindCat = (cls, field) => {
      this.shadowRoot.querySelectorAll('.' + cls).forEach(input => {
        input.oninput = (e) => this.updateCategory(input.getAttribute('data-idx'), field, e.target.value);
      });
    };
    bindCat('c-en', 'nameEN');
    bindCat('c-uk', 'nameUK');
    bindCat('c-ru', 'nameRU');
    bindCat('h-en', 'hintEN');
    bindCat('h-uk', 'hintUK');
    bindCat('h-ru', 'hintRU');
    bindCat('c-type', 'categoryType');
    bindCat('c-val', 'actionValue');

    this.shadowRoot.querySelectorAll('.c-color-picker').forEach(input => {
      input.onchange = (e) => {
        const idx = input.getAttribute('data-idx');
        // e.target.value is #RRGGBB. We append '4d' which is approx 30% opacity in 8-digit hex.
        this.updateCategory(idx, 'color', e.target.value + '4d');
      };
    });

    this.shadowRoot.querySelectorAll('.c-color-clear').forEach(btn => {
      btn.onclick = (e) => {
        const idx = btn.getAttribute('data-idx');
        this.updateCategory(idx, 'color', '');
      };
    });

    // Footer actions
    this.shadowRoot.getElementById('btn-download').onclick = () => this.downloadGame();
    this.shadowRoot.getElementById('btn-save').onclick = () => this.saveGame();

    // Initial validation state
    this.updateValidationUI();

    // Restore scroll position
    const newModal = this.shadowRoot.getElementById('modal');
    if (newModal && savedScrollTop > 0) {
      newModal.scrollTop = savedScrollTop;
    }
  }
}

customElements.define('game-builder', GameBuilder);
