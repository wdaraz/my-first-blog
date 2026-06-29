import * as THREE from 'three';

const TEXTURE_BASE = new URL('textures/', import.meta.url).href;

const WOOD_TYPES = ['oak', 'walnut', 'ash', 'olive'];

export class TextureManager {
  constructor() {
    this.loader = new THREE.TextureLoader();
    this.woodCache = {};
    this.epoxyNormal = null;
    this.ready = false;
    this.loadError = null;
  }

  loadTexture(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  loadTextureLinear(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.NoColorSpace;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  async loadAll() {
    try {
      await Promise.all(WOOD_TYPES.map((type) => this.loadWood(type)));
      this.epoxyNormal = await this.createEpoxyNormalTexture();
      this.ready = true;
    } catch (err) {
      console.warn('Tekstury niedostępne, używam kolorów:', err);
      this.loadError = err;
      this.ready = true;
    }
  }

  async loadWood(type) {
    if (this.woodCache[type]) return this.woodCache[type];

    const [map, normalMap, roughnessMap] = await Promise.all([
      this.loadTexture(`${TEXTURE_BASE}${type}_color.jpg`),
      this.loadTextureLinear(`${TEXTURE_BASE}${type}_normal.jpg`),
      this.loadTextureLinear(`${TEXTURE_BASE}${type}_roughness.jpg`),
    ]);

    this.woodCache[type] = { map, normalMap, roughnessMap };
    return this.woodCache[type];
  }

  createEpoxyNormalTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const wave =
          Math.sin(x * 0.18) * 0.08 +
          Math.sin(y * 0.14) * 0.06 +
          Math.sin((x + y) * 0.09) * 0.04;
        const nx = 128 + wave * 90;
        const ny = 128 + Math.cos(x * 0.15 + y * 0.11) * wave * 70;
        data[i] = nx;
        data[i + 1] = ny;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace;
    return texture;
  }

  cloneMap(texture, repeatX, repeatY, rotation = 0) {
    if (!texture) return null;
    const t = texture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.rotation = rotation;
    t.needsUpdate = true;
    return t;
  }

  getWoodMaps(type, lengthCm, widthCm) {
    const set = this.woodCache[type];
    if (!set) return null;

    const repeatX = Math.max(lengthCm / 55, 0.8);
    const repeatY = Math.max(widthCm / 55, 0.8);

    return {
      map: this.cloneMap(set.map, repeatX, repeatY),
      normalMap: this.cloneMap(set.normalMap, repeatX, repeatY),
      roughnessMap: this.cloneMap(set.roughnessMap, repeatX, repeatY),
      normalScale: new THREE.Vector2(0.35, 0.35),
    };
  }

  getEpoxyNormal(lengthCm, widthCm) {
    if (!this.epoxyNormal) return null;
    const repeatX = Math.max(lengthCm / 40, 1);
    const repeatY = Math.max(widthCm / 40, 1);
    return this.cloneMap(this.epoxyNormal, repeatX, repeatY, 0);
  }

  hasWoodTextures(type) {
    return Boolean(this.woodCache[type]);
  }
}
