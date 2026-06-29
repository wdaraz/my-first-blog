import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextureManager } from './epoxy-textures.js';

/**
 * Konfigurator 3D stołów epoksydowych — Shopify
 * Three.js + dynamiczna wycena + Ajax Cart API
 */

const WOOD_COLORS = {
  oak: 0xc4a35a,
  walnut: 0x5c3d2e,
  ash: 0xe8dcc8,
  olive: 0x8b6914,
};

const EPOXY_COLORS = {
  clear: 0x88ccee,
  ocean: 0x1a6b8a,
  emerald: 0x2d6a4f,
  amber: 0xd4a017,
  black: 0x1a1a2e,
};

const LEG_COLORS = {
  black: 0x222222,
  gold: 0xc9a227,
  silver: 0xb0b0b0,
  white: 0xf0f0f0,
};

const WOOD_LABELS = {
  oak: 'Dąb',
  walnut: 'Orzech',
  ash: 'Jesion',
  olive: 'Oliwka',
};

const EPOXY_STYLE_LABELS = {
  river: 'Rzeka (środek)',
  accent: 'Pas akcentowy',
  full: 'Pełne wypełnienie',
};

const EPOXY_COLOR_LABELS = {
  clear: 'Przezroczysta',
  ocean: 'Ocean',
  emerald: 'Szmaragd',
  amber: 'Bursztyn',
  black: 'Czarna',
};

const EDGE_LABELS = {
  live: 'Naturalna (live edge)',
  straight: 'Prosta (szlifowana)',
};

const LEG_LABELS = {
  hairpin: 'Hairpin (metal)',
  wooden: 'Drewniane',
  u_frame: 'Rama U (stal)',
  x_frame: 'Rama X (stal)',
};

const LEG_COLOR_LABELS = {
  black: 'Czarny',
  gold: 'Złoty',
  silver: 'Srebrny',
  white: 'Biały',
};

class EpoxyTableConfigurator {
  constructor(root) {
    this.root = root;
    this.sectionId = root.dataset.sectionId;
    this.canvas = root.querySelector('canvas');
    this.form = root.querySelector('.epoxy-configurator__form');
    this.priceEl = root.querySelector('.epoxy-configurator__price');
    this.specsEl = root.querySelector('.epoxy-configurator__specs');
    this.ctaBtn = root.querySelector('.epoxy-configurator__cta');

    this.variantId = root.dataset.variantId || '';
    this.ctaAction = root.dataset.ctaAction || (this.variantId ? 'cart' : 'copy');
    this.ctaUrl = root.dataset.ctaUrl || '';
    this.ctaEmail = root.dataset.ctaEmail || '';
    this.basePrice = parseInt(root.dataset.basePrice, 10) || 0;
    this.addonVariantId = root.dataset.addonVariantId || '';
    this.addonUnitPrice = parseInt(root.dataset.addonUnitPrice, 10) || 100;
    this.moneyFormat = root.dataset.moneyFormat || '{{amount}} zł';
    this.pricePerM2 = parseInt(root.dataset.pricePerM2, 10) || 350000;
    this.epoxyPricePerLiter = parseInt(root.dataset.epoxyPricePerLiter, 10) || 8000;
    this.minPrice = parseInt(root.dataset.minPrice, 10) || 250000;
    this.epoxyDepth = parseFloat(root.dataset.epoxyDepth) || 2;

    this.config = this.readConfig();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.tableGroup = null;
    this.animationId = null;
    this.textureManager = new TextureManager();
    this.isLoading = true;

    this.init();
  }

  async init() {
    this.setupCta();
    this.bindEvents();
    this.showLoading(true);

    await this.textureManager.loadAll();

    this.showLoading(false);
    this.isLoading = false;
    this.initThree();
    this.updateAll();
  }

  showLoading(visible) {
    const wrap = this.canvas?.parentElement;
    if (!wrap) return;

    let loader = wrap.querySelector('.epoxy-configurator__loader');
    if (!loader && visible) {
      loader = document.createElement('div');
      loader.className = 'epoxy-configurator__loader';
      loader.innerHTML = '<span class="epoxy-configurator__loader-spinner"></span><span>Ładowanie tekstur…</span>';
      wrap.appendChild(loader);
    }
    if (loader) loader.hidden = !visible;
  }

  setupCta() {
    if (!this.ctaBtn) return;

    const labels = {
      cart: 'Dodaj do koszyka',
      mailto: 'Wyślij zapytanie e-mail',
      link: 'Przejdź do zamówienia',
      copy: 'Kopiuj konfigurację',
      none: null,
    };

    const text = labels[this.ctaAction];
    const ctaText = this.ctaBtn.querySelector('.epoxy-configurator__cta-text');

    if (text && ctaText) {
      ctaText.textContent = text;
    }

    if (this.ctaAction === 'none') {
      this.ctaBtn.hidden = true;
    }
  }

  readConfig() {
    const getRadio = (name) => {
      const el = this.form.querySelector(`input[name="${name}"]:checked`);
      return el ? el.value : '';
    };

    return {
      length: parseFloat(this.form.querySelector('[data-input="length"]').value),
      width: parseFloat(this.form.querySelector('[data-input="width"]').value),
      thickness: parseFloat(this.form.querySelector('[data-input="thickness"]').value),
      wood: getRadio('wood'),
      epoxy_style: this.form.querySelector('[data-input="epoxy_style"]').value,
      epoxy_color: getRadio('epoxy_color'),
      edge: getRadio('edge'),
      legs: getRadio('legs'),
      leg_color: this.form.querySelector('[data-input="leg_color"]').value,
    };
  }

  getRadioAddon(name) {
    const el = this.form.querySelector(`input[name="${name}"]:checked`);
    return el ? parseInt(el.dataset.priceAddon, 10) || 0 : 0;
  }

  calculatePrice() {
    const { length, width, thickness, epoxy_style } = this.config;
    const areaM2 = (length * width) / 10000;

    let epoxyWidthCm;
    if (epoxy_style === 'river') {
      epoxyWidthCm = width * 0.22;
    } else if (epoxy_style === 'accent') {
      epoxyWidthCm = width * 0.12;
    } else {
      epoxyWidthCm = width;
    }

    const epoxyLiters = (length * epoxyWidthCm * this.epoxyDepth) / 1000;

    let price = this.basePrice;
    price += Math.round(areaM2 * this.pricePerM2);
    price += Math.round(epoxyLiters * this.epoxyPricePerLiter);
    price += this.getRadioAddon('wood');
    price += this.getRadioAddon('epoxy_color');
    price += this.getRadioAddon('edge');
    price += this.getRadioAddon('legs');

    const thicknessFactor = thickness > 4 ? (thickness - 4) * 15000 : 0;
    price += Math.round(thicknessFactor);

    return Math.max(price, this.minPrice);
  }

  formatMoney(cents) {
    const amount = (cents / 100).toFixed(2);
    if (this.moneyFormat.includes('{{amount_with_comma_separator}}')) {
      return this.moneyFormat.replace(
        '{{amount_with_comma_separator}}',
        amount.replace('.', ',')
      );
    }
    if (this.moneyFormat.includes('{{amount}}')) {
      return this.moneyFormat.replace('{{amount}}', amount);
    }
    return amount + ' zł';
  }

  bindEvents() {
    this.form.addEventListener('input', () => this.onConfigChange());
    this.form.addEventListener('change', () => this.onConfigChange());
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCta();
    });
    window.addEventListener('resize', () => this.onResize());
  }

  onConfigChange() {
    if (this.isLoading) return;
    this.config = this.readConfig();
    this.updateOutputs();
    this.updatePrice();
    this.updateSpecs();
    this.rebuildTable();
  }

  updateOutputs() {
    this.root.querySelectorAll('[data-for]').forEach((output) => {
      const key = output.dataset.for;
      const val = this.config[key];
      if (val !== undefined) {
        output.textContent = `${val} cm`;
      }
    });

    const dimLength = this.root.querySelector('.epoxy-configurator__dim--length');
    const dimWidth = this.root.querySelector('.epoxy-configurator__dim--width');
    const dimHeight = this.root.querySelector('.epoxy-configurator__dim--height');
    if (dimLength) dimLength.textContent = `${this.config.length} cm`;
    if (dimWidth) dimWidth.textContent = `${this.config.width} cm`;
    if (dimHeight) dimHeight.textContent = `${this.config.thickness} cm`;
  }

  updatePrice() {
    const price = this.calculatePrice();
    this.priceEl.textContent = this.formatMoney(price);
    this.currentPrice = price;
  }

  updateSpecs() {
    const { length, width } = this.config;
    const areaM2 = ((length * width) / 10000).toFixed(2);

    this.specsEl.innerHTML = `
      <li>Powierzchnia: <strong>${areaM2} m²</strong></li>
      <li>Drewno: <strong>${WOOD_LABELS[this.config.wood]}</strong></li>
      <li>Żywica: <strong>${EPOXY_COLOR_LABELS[this.config.epoxy_color]}</strong> — ${EPOXY_STYLE_LABELS[this.config.epoxy_style]}</li>
      <li>Krawędź: <strong>${EDGE_LABELS[this.config.edge]}</strong></li>
      <li>Nogi: <strong>${LEG_LABELS[this.config.legs]}</strong> (${LEG_COLOR_LABELS[this.config.leg_color]})</li>
    `;
  }

  updateAll() {
    this.updateOutputs();
    this.updatePrice();
    this.updateSpecs();
  }

  initThree() {
    const wrap = this.canvas.parentElement;
    const w = wrap.clientWidth;
    const h = Math.max(wrap.clientHeight, 400);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f3ef);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(2.5, 1.8, 2.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 6;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0.4, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(5, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.35);
    fillLight.position.set(-3, 4, -2);
    this.scene.add(fillLight);

    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.tableGroup = new THREE.Group();
    this.scene.add(this.tableGroup);

    this.rebuildTable();
    this.animate();
  }

  scale(cm) {
    return cm / 100;
  }

  createWoodMaterial(lengthCm, widthCm) {
    const maps = this.textureManager.getWoodMaps(this.config.wood, lengthCm, widthCm);

    if (maps) {
      return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: maps.map,
        normalMap: maps.normalMap,
        roughnessMap: maps.roughnessMap,
        normalScale: maps.normalScale,
        roughness: 0.85,
        metalness: 0.02,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: WOOD_COLORS[this.config.wood] || 0xc4a35a,
      roughness: 0.75,
      metalness: 0.05,
    });
  }

  createEpoxyMaterial(lengthCm, widthCm) {
    const color = EPOXY_COLORS[this.config.epoxy_color] || 0x88ccee;
    const isClear = this.config.epoxy_color === 'clear';
    const normalMap = this.textureManager.getEpoxyNormal(lengthCm, widthCm);

    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: isClear ? 0.02 : 0.06,
      metalness: 0.0,
      transmission: isClear ? 0.88 : 0.45,
      thickness: 0.35,
      transparent: true,
      opacity: isClear ? 0.78 : 0.93,
      ior: 1.52,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      normalMap,
      normalScale: new THREE.Vector2(0.15, 0.15),
      envMapIntensity: 1.2,
    });
  }

  createLegMaterial(lengthCm) {
    if (this.config.legs === 'wooden') {
      const maps = this.textureManager.getWoodMaps(this.config.wood, 30, lengthCm);
      if (maps) {
        return new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: maps.map,
          normalMap: maps.normalMap,
          roughnessMap: maps.roughnessMap,
          normalScale: maps.normalScale,
          roughness: 0.8,
          metalness: 0.02,
        });
      }
    }

    return new THREE.MeshStandardMaterial({
      color: LEG_COLORS[this.config.leg_color] || 0x222222,
      roughness: this.config.legs === 'wooden' ? 0.7 : 0.35,
      metalness: this.config.legs === 'wooden' ? 0.05 : 0.85,
    });
  }

  buildTop() {
    const { length, width, thickness, epoxy_style, edge } = this.config;
    const sl = this.scale(length);
    const sw = this.scale(width);
    const st = this.scale(thickness);
    const group = new THREE.Group();

    const woodMat = this.createWoodMaterial(length, width);
    const epoxyMat = this.createEpoxyMaterial(length, width);

    let epoxyFrac;
    if (epoxy_style === 'river') epoxyFrac = 0.22;
    else if (epoxy_style === 'accent') epoxyFrac = 0.12;
    else epoxyFrac = 1.0;

    const epoxyW = sw * epoxyFrac;
    const woodW = (sw - epoxyW) / 2;

    if (epoxy_style === 'full') {
      const top = new THREE.Mesh(new THREE.BoxGeometry(sl, st, sw), epoxyMat);
      top.castShadow = true;
      group.add(top);
    } else {
      const leftWood = new THREE.Mesh(new THREE.BoxGeometry(sl, st, woodW), woodMat);
      leftWood.position.z = -(epoxyW / 2 + woodW / 2);
      leftWood.castShadow = true;
      group.add(leftWood);

      const epoxy = new THREE.Mesh(new THREE.BoxGeometry(sl, st * 0.95, epoxyW), epoxyMat);
      epoxy.position.y = st * 0.025;
      epoxy.castShadow = true;
      group.add(epoxy);

      const rightWood = new THREE.Mesh(new THREE.BoxGeometry(sl, st, woodW), woodMat);
      rightWood.position.z = epoxyW / 2 + woodW / 2;
      rightWood.castShadow = true;
      group.add(rightWood);
    }

    if (edge === 'live' && epoxy_style !== 'full') {
      const waveSegments = 24;
      for (const side of [-1, 1]) {
        const waveGeo = new THREE.BoxGeometry(sl, st * 0.15, woodW * 0.3, waveSegments, 1, 4);
        const pos = waveGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          pos.setZ(i, pos.getZ(i) + Math.sin(x * 8) * 0.008 * side);
        }
        waveGeo.computeVertexNormals();
        const wave = new THREE.Mesh(waveGeo, woodMat);
        const zBase = side < 0 ? -(epoxyW / 2 + woodW) : epoxyW / 2 + woodW;
        wave.position.set(0, -st * 0.35, zBase);
        group.add(wave);
      }
    }

    return group;
  }

  buildLegs() {
    const { length, width, legs } = this.config;
    const sl = this.scale(length);
    const sw = this.scale(width);
    const legH = 0.72;
    const inset = 0.12;
    const group = new THREE.Group();
    const mat = this.createLegMaterial(length);

    const positions = [
      [-sl / 2 + inset, -legH / 2, -sw / 2 + inset],
      [sl / 2 - inset, -legH / 2, -sw / 2 + inset],
      [-sl / 2 + inset, -legH / 2, sw / 2 - inset],
      [sl / 2 - inset, -legH / 2, sw / 2 - inset],
    ];

    positions.forEach(([x, y, z]) => {
      let leg;

      if (legs === 'hairpin') {
        leg = new THREE.Group();
        const rod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, legH, 8),
          mat
        );
        leg.add(rod);

        for (const angle of [-0.2, 0, 0.2]) {
          const pin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.005, 0.005, legH * 0.85, 6),
            mat
          );
          pin.position.set(Math.sin(angle) * 0.04, -legH * 0.1, Math.cos(angle) * 0.02);
          pin.rotation.x = angle;
          leg.add(pin);
        }
      } else if (legs === 'wooden') {
        leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, legH, 0.06), mat);
      } else if (legs === 'u_frame') {
        leg = new THREE.Group();
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.03, legH, 0.03), mat);
        left.position.x = -0.1;
        const right = new THREE.Mesh(new THREE.BoxGeometry(0.03, legH, 0.03), mat);
        right.position.x = 0.1;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.03, 0.03), mat);
        bar.position.y = legH / 2 - 0.04;
        leg.add(left, right, bar);
      } else {
        leg = new THREE.Group();
        const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.025, legH, 0.025), mat);
        h1.rotation.z = 0.35;
        const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, legH, 0.025), mat);
        h2.rotation.z = -0.35;
        leg.add(h1, h2);
      }

      leg.position.set(x, y - this.scale(this.config.thickness) / 2, z);
      leg.castShadow = true;
      group.add(leg);
    });

    return group;
  }

  rebuildTable() {
    if (!this.tableGroup) return;

    while (this.tableGroup.children.length) {
      const child = this.tableGroup.children[0];
      this.tableGroup.remove(child);
        child.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
              ['map', 'normalMap', 'roughnessMap'].forEach((key) => {
                if (m[key]) m[key].dispose();
              });
              m.dispose();
            });
          }
        });
    }

    const top = this.buildTop();
    const legs = this.buildLegs();
    const tableHeight = this.scale(this.config.thickness) / 2 + 0.72;

    top.position.y = tableHeight;
    this.tableGroup.add(legs);
    this.tableGroup.add(top);

    if (this.controls) {
      this.controls.target.set(0, tableHeight * 0.5, 0);
    }
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    const wrap = this.canvas.parentElement;
    const w = wrap.clientWidth;
    const h = Math.max(wrap.clientHeight, 400);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  getLineItemProperties() {
    const c = this.config;
    return {
      Długość: `${c.length} cm`,
      Szerokość: `${c.width} cm`,
      'Grubość blatu': `${c.thickness} cm`,
      Drewno: WOOD_LABELS[c.wood],
      'Styl żywicy': EPOXY_STYLE_LABELS[c.epoxy_style],
      'Kolor żywicy': EPOXY_COLOR_LABELS[c.epoxy_color],
      Krawędź: EDGE_LABELS[c.edge],
      Nogi: LEG_LABELS[c.legs],
      'Kolor nóg': LEG_COLOR_LABELS[c.leg_color],
      '_Wycena konfiguratora': this.formatMoney(this.currentPrice),
    };
  }

  getConfigSummary() {
    const props = this.getLineItemProperties();
    return Object.entries(props)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, val]) => `${key}: ${val}`)
      .join('\n');
  }

  async handleCta() {
    if (this.ctaAction === 'cart' && this.variantId) {
      await this.addToCart();
      return;
    }

    if (this.ctaAction === 'mailto' && this.ctaEmail) {
      const subject = encodeURIComponent('Zapytanie — stół epoksydowy');
      const body = encodeURIComponent(
        `Witam,\n\nProszę o wycenę stołu epoksydowego:\n\n${this.getConfigSummary()}\n\nSzacunkowa cena: ${this.formatMoney(this.currentPrice)}\n`
      );
      window.location.href = `mailto:${this.ctaEmail}?subject=${subject}&body=${body}`;
      return;
    }

    if (this.ctaAction === 'link' && this.ctaUrl) {
      const url = new URL(this.ctaUrl, window.location.origin);
      url.searchParams.set('config', JSON.stringify(this.config));
      url.searchParams.set('price', String(this.currentPrice));
      window.location.href = url.toString();
      return;
    }

    if (this.ctaAction === 'copy') {
      const text = `${this.getConfigSummary()}\n\nSzacunkowa cena: ${this.formatMoney(this.currentPrice)}`;
      try {
        await navigator.clipboard.writeText(text);
        this.showNotification('Skopiowano konfigurację do schowka', 'success');
      } catch {
        this.showNotification(text, 'success');
      }
      return;
    }

    this.showNotification(
      'Konfigurator w trybie podglądu — podłącz produkt lub ustaw akcję przycisku.',
      'success'
    );
  }

  async addToCart() {
    if (!this.variantId) {
      this.handleCta();
      return;
    }

    const ctaText = this.ctaBtn.querySelector('.epoxy-configurator__cta-text');
    const ctaLoading = this.ctaBtn.querySelector('.epoxy-configurator__cta-loading');

    this.ctaBtn.disabled = true;
    ctaText.hidden = true;
    ctaLoading.hidden = false;

    const items = [
      {
        id: parseInt(this.variantId, 10),
        quantity: 1,
        properties: this.getLineItemProperties(),
      },
    ];

    if (this.addonVariantId && this.addonUnitPrice > 0) {
      const addonQty = Math.max(
        0,
        Math.round((this.currentPrice - this.basePrice) / this.addonUnitPrice)
      );
      if (addonQty > 0) {
        items.push({
          id: parseInt(this.addonVariantId, 10),
          quantity: addonQty,
          properties: {
            'Powiązane z': 'Konfigurator stołu epoksydowego',
          },
        });
      }
    }

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.description || 'Błąd dodawania do koszyka');
      }

      this.showNotification('Dodano do koszyka!', 'success');
      this.refreshCartDrawer();
      document.dispatchEvent(new CustomEvent('cart:refresh'));
    } catch (err) {
      console.error(err);
      this.showNotification(err.message || 'Nie udało się dodać do koszyka', 'error');
    } finally {
      this.ctaBtn.disabled = false;
      ctaText.hidden = false;
      ctaLoading.hidden = true;
    }
  }

  showNotification(message, type) {
    const existing = this.root.querySelector('.epoxy-configurator__toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `epoxy-configurator__toast epoxy-configurator__toast--${type}`;
    toast.textContent = message;
    this.root.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  refreshCartDrawer() {
    fetch('/cart.js')
      .then((r) => r.json())
      .then((cart) => {
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));

        const cartCount = document.querySelector('[data-cart-count], .cart-count-bubble');
        if (cartCount) cartCount.textContent = cart.item_count;

        const drawer = document.querySelector('cart-drawer, [data-cart-drawer]');
        if (drawer && typeof drawer.open === 'function') drawer.open();
      })
      .catch(() => {});
  }
}

function initAll() {
  document.querySelectorAll('.epoxy-configurator').forEach((root) => {
    if (root._epoxyInit) return;
    root._epoxyInit = true;
    new EpoxyTableConfigurator(root);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}

document.addEventListener('shopify:section:load', (e) => {
  const root = e.target.querySelector('.epoxy-configurator');
  if (root) {
    root._epoxyInit = false;
    initAll();
  }
});
