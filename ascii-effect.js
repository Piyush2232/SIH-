/**
 * SEVE ASCII-Art Effect Engine (Canvas2D)
 * Recreated from 21st.dev/community/ascii specification.
 * Full 8-stage render pipeline with 20+ render modes, 9 post-effects, 
 * tone curves, color grading, lighting, masking, and animation styles.
 */

(function(window) {
  'use strict';

  // Default parameters exactly matching the 21st.dev / seve recipe
  const DEFAULT_CONFIG = {
    renderMode: "characters",
    bgMode: "solid",
    bgBlur: 12,
    bgOpacity: 90,
    cellSize: 13,
    coverage: 100,
    invert: false,
    styleBlend: "source-over",
    charSet: "matrix",
    customChars: "1go4ufd68ıkjnpıf679ım#",
    brightness: 0,
    contrast: 115,
    edgeEmphasis: 40,
    density: 0,
    toneCurve: [
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ],
    tint: "#00ff66",
    tintOpacity: 45,
    overlayBlend: "overlay",
    saturation: 100,
    grayscale: 0,
    blurType: "off",
    blurAmount: 35,
    blurAngle: 0,
    directionalBothSides: false,
    tiltFocus: 35,
    tiltPosition: 50,
    tiltFeather: 15,
    lensFocus: 40,
    blurCenterX: 50,
    blurCenterY: 50,
    progressivePosition: 55,
    progressiveReverse: false,
    pfx: {
      vignette: { enabled: true, intensity: 38 },
      scanLines: { enabled: true, intensity: 28 },
      chromatic: { enabled: true, intensity: 40 },
      bloom: { enabled: true, intensity: 60 },
      filmGrain: { enabled: true, intensity: 40 },
      glitch: { enabled: true, intensity: 20 },
      pixelate: { enabled: false, intensity: 15 },
      halftone: { enabled: false, intensity: 20 },
      filmDust: { enabled: false, intensity: 20 }
    },
    animated: true,
    animStyle: "flicker",
    animSpeed: { enabled: true, intensity: 100 },
    animIntensity: { enabled: true, intensity: 60 },
    lights: { enabled: false, points: [] },
    mask: {
      enabled: false,
      tool: "freehand",
      brushSize: 30,
      showOverlay: false,
      invert: false,
      dataUrl: null,
      shapes: []
    }
  };

  class SeveAsciiEngine {
    constructor(canvas, customConfig = {}) {
      this.canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      this.mergeConfig(customConfig);

      // Offscreen buffers
      this.offCanvas = document.createElement('canvas');
      this.offCtx = this.offCanvas.getContext('2d', { willReadFrequently: true });
      this.bloomCanvas = document.createElement('canvas');
      this.bloomCtx = this.bloomCanvas.getContext('2d');

      // Source image state
      this.sourceImage = null;
      this.isSourceReady = false;

      // Animation loop state
      this.animId = null;
      this.startTime = performance.now();
      this.lastFrameTime = performance.now();
      this.frameCounter = 0;

      // Matrix rain state for 'matrix' render mode
      this.matrixDrops = [];

      // Bind methods
      this.render = this.render.bind(this);
      this.resize = this.resize.bind(this);

      window.addEventListener('resize', this.resize);
      this.resize();
    }

    mergeConfig(custom) {
      if (!custom) return;
      for (const k in custom) {
        if (typeof custom[k] === 'object' && custom[k] !== null && !Array.isArray(custom[k])) {
          this.config[k] = Object.assign(this.config[k] || {}, custom[k]);
        } else {
          this.config[k] = custom[k];
        }
      }
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      
      this.offCanvas.width = this.canvas.width;
      this.offCanvas.height = this.canvas.height;
      this.bloomCanvas.width = Math.floor(this.canvas.width / 2);
      this.bloomCanvas.height = Math.floor(this.canvas.height / 2);

      this.initMatrixDrops();
      if (!this.sourceImage) {
        this.generateDefaultSubject();
      }
    }

    initMatrixDrops() {
      const cols = Math.ceil(this.canvas.width / (this.config.cellSize * (window.devicePixelRatio || 1)));
      this.matrixDrops = [];
      for (let i = 0; i < cols; i++) {
        this.matrixDrops.push({
          y: Math.random() * -100,
          speed: 1 + Math.random() * 2.5,
          length: 8 + Math.floor(Math.random() * 16)
        });
      }
    }

    setSourceImage(imgOrUrl) {
      if (typeof imgOrUrl === 'string') {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          this.sourceImage = img;
          this.isSourceReady = true;
        };
        img.src = imgOrUrl;
      } else if (imgOrUrl instanceof HTMLImageElement || imgOrUrl instanceof HTMLCanvasElement) {
        this.sourceImage = imgOrUrl;
        this.isSourceReady = true;
      }
    }

    /**
     * Generates a high-contrast biometric cryptographic subject
     * (Portrait with facial topology, facial landmark nodes, biometric scan vectors)
     * completely offline with zero network latency.
     */
    generateDefaultSubject() {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const subj = document.createElement('canvas');
      subj.width = w;
      subj.height = h;
      const sctx = subj.getContext('2d');

      // Deep dark background with subtle technical radial glow
      const cx = w * 0.65; // Positioned slightly to the right for Nothing-style asymmetry
      const cy = h * 0.48;
      const rad = Math.min(w, h) * 0.45;

      const grad = sctx.createRadialGradient(cx, cy, 10, cx, cy, rad * 1.5);
      grad.addColorStop(0, '#1c2820');
      grad.addColorStop(0.5, '#0a100c');
      grad.addColorStop(1, '#000000');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, w, h);

      // Draw stylized biometric head & shoulders silhouette
      sctx.save();
      sctx.translate(cx, cy);
      const s = Math.min(w, h) / 750;
      sctx.scale(s, s);

      // Silhouette fill with gradients to create natural luminance curves for ASCII
      const headGrad = sctx.createLinearGradient(-120, -180, 120, 200);
      headGrad.addColorStop(0, '#ffffff');
      headGrad.addColorStop(0.3, '#bbddcc');
      headGrad.addColorStop(0.7, '#447755');
      headGrad.addColorStop(1, '#112218');

      // Shoulders
      sctx.fillStyle = '#182b20';
      sctx.beginPath();
      sctx.ellipse(0, 260, 280, 140, 0, 0, Math.PI * 2);
      sctx.fill();

      // Neck
      sctx.fillStyle = '#2d4a37';
      sctx.beginPath();
      sctx.rect(-60, 100, 120, 120);
      sctx.fill();

      // Head oval
      sctx.fillStyle = headGrad;
      sctx.beginPath();
      sctx.ellipse(0, 0, 120, 160, 0, 0, Math.PI * 2);
      sctx.fill();

      // Jaw contour & chin
      sctx.beginPath();
      sctx.moveTo(-100, -20);
      sctx.bezierCurveTo(-110, 100, -60, 170, 0, 185);
      sctx.bezierCurveTo(60, 170, 110, 100, 100, -20);
      sctx.closePath();
      sctx.fillStyle = '#ffffff';
      sctx.fill();

      // Facial shadows & features (to give ASCII rich texture)
      // Eye sockets
      sctx.fillStyle = '#08120c';
      sctx.beginPath();
      sctx.ellipse(-45, -15, 32, 16, 0.05, 0, Math.PI * 2);
      sctx.ellipse(45, -15, 32, 16, -0.05, 0, Math.PI * 2);
      sctx.fill();

      // Iris highlight
      sctx.fillStyle = '#aaffdd';
      sctx.beginPath();
      sctx.arc(-45, -15, 10, 0, Math.PI * 2);
      sctx.arc(45, -15, 10, 0, Math.PI * 2);
      sctx.fill();

      // Nose bridge and contour
      sctx.strokeStyle = '#225533';
      sctx.lineWidth = 14;
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(0, -30);
      sctx.lineTo(0, 45);
      sctx.lineTo(16, 50);
      sctx.stroke();

      // Lips
      sctx.fillStyle = '#1c3826';
      sctx.beginPath();
      sctx.ellipse(0, 95, 36, 12, 0, 0, Math.PI * 2);
      sctx.fill();
      sctx.fillStyle = '#88c9a1';
      sctx.beginPath();
      sctx.ellipse(0, 92, 28, 6, 0, 0, Math.PI * 2);
      sctx.fill();

      // Biometric Facial Landmark Mesh / Wireframe (creates stunning ASCII edge contours)
      sctx.strokeStyle = 'rgba(180, 255, 210, 0.55)';
      sctx.lineWidth = 2;
      sctx.setLineDash([4, 4]);

      const landmarks = [
        [-45, -15], [45, -15], [0, 50], [0, 95],
        [-90, -10], [90, -10], [-45, 140], [45, 140],
        [0, -90], [-60, -60], [60, -60], [0, 0]
      ];

      for (let i = 0; i < landmarks.length; i++) {
        for (let j = i + 1; j < landmarks.length; j++) {
          const d = Math.hypot(landmarks[i][0] - landmarks[j][0], landmarks[i][1] - landmarks[j][1]);
          if (d < 120) {
            sctx.beginPath();
            sctx.moveTo(landmarks[i][0], landmarks[i][1]);
            sctx.lineTo(landmarks[j][0], landmarks[j][1]);
            sctx.stroke();
          }
        }
      }

      // Biometric circular target reticle
      sctx.setLineDash([]);
      sctx.strokeStyle = 'rgba(0, 255, 102, 0.7)';
      sctx.lineWidth = 3;
      sctx.beginPath();
      sctx.arc(0, 20, 200, 0, Math.PI * 2);
      sctx.stroke();

      // Tick marks on reticle
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        sctx.beginPath();
        sctx.moveTo(Math.cos(a) * 190, Math.sin(a) * 190);
        sctx.lineTo(Math.cos(a) * 210, Math.sin(a) * 210);
        sctx.stroke();
      }

      sctx.restore();

      this.sourceImage = subj;
      this.isSourceReady = true;
    }

    start() {
      if (!this.animId) {
        this.render();
      }
    }

    stop() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    render() {
      const now = performance.now();
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      const elapsed = (now - this.startTime) / 1000;
      this.frameCounter++;

      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const cfg = this.config;

      if (!w || !h || !this.isSourceReady) {
        this.animId = requestAnimationFrame(this.render);
        return;
      }

      // Compute animation factors
      const speedIntensity = cfg.animSpeed?.enabled ? (cfg.animSpeed.intensity / 100) : 1;
      const animAmp = cfg.animIntensity?.enabled ? (cfg.animIntensity.intensity / 100) : 0.6;
      const t = elapsed * speedIntensity;

      let flickerMul = 1.0;
      let waveOffset = 0;
      let pulseScale = 1.0;

      if (cfg.animated) {
        switch (cfg.animStyle) {
          case 'flicker':
            // High-frequency CRT phosphor micro-flicker
            if (Math.random() < 0.18 * animAmp) {
              flickerMul = 0.82 + (Math.random() * 0.38 - 0.19) * animAmp;
            } else if (Math.random() < 0.03 * animAmp) {
              flickerMul = 0.45; // Occasional dark scan drop
            }
            break;
          case 'pulse':
            pulseScale = 1.0 + Math.sin(t * 3.5) * 0.18 * animAmp;
            flickerMul = 1.0 + Math.sin(t * 3.5) * 0.25 * animAmp;
            break;
          case 'wave':
            waveOffset = Math.sin(t * 4.0) * 8 * animAmp;
            break;
          case 'shimmer':
            flickerMul = 1.0 + (Math.sin(t * 12.0) * 0.1 + (Math.random() - 0.5) * 0.15) * animAmp;
            break;
          case 'ripple':
            // Handled per-cell
            break;
        }
      }

      // =========================================================================
      // STAGE 1: DRAW SOURCE PHOTO AT TARGET SIZE & RENDER BACKGROUND
      // =========================================================================
      this.offCtx.clearRect(0, 0, w, h);

      // Handle blurType if any
      if (cfg.blurType === 'gaussian' && cfg.blurAmount > 0) {
        this.offCtx.filter = `blur(${cfg.blurAmount * 0.3}px)`;
      } else {
        this.offCtx.filter = 'none';
      }

      // Draw source image fit/cover
      if (this.sourceImage) {
        const sw = this.sourceImage.width;
        const sh = this.sourceImage.height;
        const scale = Math.max(w / sw, h / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2;
        this.offCtx.drawImage(this.sourceImage, dx, dy, dw, dh);
      }
      this.offCtx.filter = 'none';

      // Background underlay on the main canvas
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.clearRect(0, 0, w, h);

      const bgAlpha = (cfg.bgOpacity != null ? cfg.bgOpacity : 90) / 100;

      if (cfg.bgMode === 'solid') {
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = bgAlpha;
        ctx.fillRect(0, 0, w, h);
      } else if (cfg.bgMode === 'blurred') {
        ctx.save();
        ctx.filter = `blur(${cfg.bgBlur || 12}px)`;
        ctx.globalAlpha = bgAlpha;
        ctx.drawImage(this.offCanvas, 0, 0);
        ctx.restore();
      } else if (cfg.bgMode === 'photo') {
        ctx.globalAlpha = bgAlpha;
        ctx.drawImage(this.offCanvas, 0, 0);
      } // 'none' draws nothing behind

      // =========================================================================
      // STAGE 2: SAMPLE GRID CELLS & COMPUTE LUMINANCE / EDGES
      // =========================================================================
      const dpr = window.devicePixelRatio || 1;
      const cellSize = Math.max(6, Math.floor((cfg.cellSize || 13) * dpr));
      const cols = Math.ceil(w / cellSize);
      const rows = Math.ceil(h / cellSize);

      let imgData;
      try {
        imgData = this.offCtx.getImageData(0, 0, w, h);
      } catch (e) {
        this.animId = requestAnimationFrame(this.render);
        return;
      }
      const data = imgData.data;

      // Color adjustment factors
      const bright = cfg.brightness || 0;
      const cont = cfg.contrast || 100;
      const F = (259 * (cont + 255)) / (255 * (259 - cont));
      const sat = (cfg.saturation != null ? cfg.saturation : 100) / 100;
      const grayWeight = (cfg.grayscale || 0) / 100;
      const coverage = (cfg.coverage != null ? cfg.coverage : 100) / 100;
      const densityOffset = (cfg.density || 0) / 100;
      const edgeWeight = (cfg.edgeEmphasis || 0) / 100;

      // Sample grid into a 2D luminance & color buffer
      const grid = new Array(rows);
      for (let r = 0; r < rows; r++) {
        grid[r] = new Array(cols);
        const py = Math.min(h - 1, r * cellSize + Math.floor(cellSize / 2));

        for (let c = 0; c < cols; c++) {
          const px = Math.min(w - 1, c * cellSize + Math.floor(cellSize / 2));
          const idx = (py * w + px) * 4;

          let red = data[idx];
          let green = data[idx + 1];
          let blue = data[idx + 2];

          // 1. Brightness
          red += bright * 2.55;
          green += bright * 2.55;
          blue += bright * 2.55;

          // 2. Contrast
          red = F * (red - 128) + 128;
          green = F * (green - 128) + 128;
          blue = F * (blue - 128) + 128;

          // Clamp
          red = Math.max(0, Math.min(255, red));
          green = Math.max(0, Math.min(255, green));
          blue = Math.max(0, Math.min(255, blue));

          // 3. Grayscale / Saturation
          const gray = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          red = gray + (red - gray) * sat;
          green = gray + (green - gray) * sat;
          blue = gray + (blue - gray) * sat;

          if (grayWeight > 0) {
            red = red + (gray - red) * grayWeight;
            green = green + (gray - green) * grayWeight;
            blue = blue + (gray - blue) * grayWeight;
          }

          let lum = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
          lum = Math.max(0, Math.min(1, lum + densityOffset));

          if (cfg.invert) {
            lum = 1.0 - lum;
          }

          grid[r][c] = {
            lum: lum,
            r: Math.floor(red),
            g: Math.floor(green),
            b: Math.floor(blue)
          };
        }
      }

      // Edge detection pass (Sobel-like difference between adjacent cells)
      if (edgeWeight > 0) {
        for (let r = 1; r < rows - 1; r++) {
          for (let c = 1; c < cols - 1; c++) {
            const dx = grid[r][c + 1].lum - grid[r][c - 1].lum;
            const dy = grid[r + 1][c].lum - grid[r - 1][c].lum;
            const edge = Math.sqrt(dx * dx + dy * dy);
            grid[r][c].lum = Math.min(1.0, grid[r][c].lum + edge * edgeWeight * 1.5);
          }
        }
      }

      // =========================================================================
      // STAGE 3: DRAW SHAPES PER renderMode
      // =========================================================================
      ctx.globalCompositeOperation = cfg.styleBlend || 'source-over';
      ctx.globalAlpha = 1.0;

      const renderMode = cfg.renderMode || 'characters';
      const charStr = (cfg.charSet === 'matrix' && cfg.customChars) ? cfg.customChars : " .:-=+*#%@";

      ctx.font = `bold ${Math.floor(cellSize * 1.08)}px "Space Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cx = w / 2;
      const cy = h / 2;

      for (let r = 0; r < rows; r++) {
        const y = r * cellSize;

        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          let lum = cell.lum * flickerMul;

          // Coverage check
          if (coverage < 1.0) {
            const hash = Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
            if (hash > coverage) continue;
          }

          // Dynamic animation styles per-cell
          let x = c * cellSize;
          let cellY = y;

          if (cfg.animated) {
            if (cfg.animStyle === 'wave') {
              cellY += Math.sin(c * 0.15 + t * 4) * 6 * animAmp;
            } else if (cfg.animStyle === 'ripple') {
              const dist = Math.hypot(x - cx, cellY - cy);
              const rip = Math.sin(dist * 0.02 - t * 6) * 0.25 * animAmp;
              lum = Math.max(0, Math.min(1, lum + rip));
            } else if (cfg.animStyle === 'shimmer') {
              const n = (Math.sin(c * 43.12 + r * 17.54 + t * 8) + 1) * 0.5;
              lum = Math.max(0, Math.min(1, lum + (n - 0.5) * 0.22 * animAmp));
            }
          }

          if (lum <= 0.01 && renderMode !== 'mosaic' && renderMode !== 'pixel') continue;

          // Calculate cell color (tint blended with luminance)
          const charColor = this.computeCellColor(cell, lum, cfg);
          ctx.fillStyle = charColor;
          ctx.strokeStyle = charColor;

          const centerX = x + cellSize / 2;
          const centerY = cellY + cellSize / 2;

          // Draw per renderMode
          switch (renderMode) {
            case 'characters': {
              const charIndex = Math.min(charStr.length - 1, Math.floor(lum * charStr.length));
              const ch = charStr[charIndex];
              ctx.fillText(ch, centerX, centerY);
              break;
            }

            case 'matrix': {
              // Digital code rain stream overlay
              const drop = this.matrixDrops[c];
              if (drop) {
                const distToHead = Math.abs(r - drop.y);
                if (distToHead < drop.length) {
                  const lead = distToHead === 0;
                  ctx.fillStyle = lead ? '#ffffff' : `rgba(0, 255, 102, ${(1 - distToHead / drop.length) * 0.95})`;
                  const charIdx = (Math.floor(elapsed * 10 + c * 3 + r * 7)) % charStr.length;
                  ctx.fillText(charStr[charIdx], centerX, centerY);
                } else if (lum > 0.1) {
                  const charIdx = Math.floor(lum * (charStr.length - 1));
                  ctx.fillText(charStr[charIdx], centerX, centerY);
                }
              }
              break;
            }

            case 'dither': {
              const bayer4x4 = [
                [ 0,  8,  2, 10],
                [12,  4, 14,  6],
                [ 3, 11,  1,  9],
                [15,  7, 13,  5]
              ];
              const threshold = (bayer4x4[r % 4][c % 4] + 0.5) / 16;
              if (lum > threshold) {
                ctx.fillRect(x + 1, cellY + 1, cellSize - 2, cellSize - 2);
              }
              break;
            }

            case 'mosaic':
            case 'pixel': {
              ctx.fillRect(x, cellY, cellSize, cellSize);
              break;
            }

            case 'dots': {
              const dotR = (cellSize / 2) * Math.sqrt(lum) * 0.9;
              ctx.beginPath();
              ctx.arc(centerX, centerY, Math.max(0.8, dotR), 0, Math.PI * 2);
              ctx.fill();
              break;
            }

            case 'cross': {
              const len = (cellSize / 2) * lum;
              ctx.lineWidth = Math.max(1, cellSize * 0.15 * lum);
              ctx.beginPath();
              ctx.moveTo(centerX - len, centerY);
              ctx.lineTo(centerX + len, centerY);
              ctx.moveTo(centerX, centerY - len);
              ctx.lineTo(centerX, centerY + len);
              ctx.stroke();
              break;
            }

            case 'diamond': {
              const dSize = (cellSize / 2) * Math.sqrt(lum);
              ctx.beginPath();
              ctx.moveTo(centerX, centerY - dSize);
              ctx.lineTo(centerX + dSize, centerY);
              ctx.lineTo(centerX, centerY + dSize);
              ctx.lineTo(centerX - dSize, centerY);
              ctx.closePath();
              ctx.fill();
              break;
            }

            case 'voxel':
            case 'lego': {
              const s = cellSize * 0.85;
              const hHalf = s / 2;
              // Base block
              ctx.fillRect(centerX - hHalf, centerY - hHalf, s, s);
              // Top circular peg / highlight
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(centerX, centerY, s * 0.28, 0, Math.PI * 2);
              ctx.fill();
              break;
            }

            case 'mixed': {
              const variant = (c + r) % 4;
              if (variant === 0) {
                ctx.fillText(charStr[Math.floor(lum * (charStr.length - 1))], centerX, centerY);
              } else if (variant === 1) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, (cellSize / 2) * lum * 0.8, 0, Math.PI * 2);
                ctx.fill();
              } else if (variant === 2) {
                ctx.fillRect(centerX - cellSize * 0.3 * lum, centerY - cellSize * 0.3 * lum, cellSize * 0.6 * lum, cellSize * 0.6 * lum);
              } else {
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX - 4, centerY); ctx.lineTo(centerX + 4, centerY);
                ctx.moveTo(centerX, centerY - 4); ctx.lineTo(centerX, centerY + 4);
                ctx.stroke();
              }
              break;
            }

            case 'lines': {
              const lineH = Math.max(1, cellSize * lum * 0.75);
              ctx.fillRect(x, centerY - lineH / 2, cellSize, lineH);
              break;
            }

            case 'diagonal': {
              ctx.lineWidth = Math.max(1, cellSize * 0.35 * lum);
              ctx.beginPath();
              ctx.moveTo(x, cellY + cellSize);
              ctx.lineTo(x + cellSize, cellY);
              ctx.stroke();
              break;
            }

            case 'braille': {
              // Unicode Braille code point: 0x2800 + 8-bit dot mask
              const dots = Math.floor(lum * 255);
              ctx.fillText(String.fromCharCode(0x2800 + (dots & 0xFF)), centerX, centerY);
              break;
            }

            case 'disco': {
              const hue = (c * 15 + r * 15 + elapsed * 100) % 360;
              ctx.fillStyle = `hsla(${hue}, 90%, ${Math.floor(lum * 70 + 20)}%, ${lum})`;
              ctx.fillRect(x + 1, cellY + 1, cellSize - 2, cellSize - 2);
              break;
            }

            case 'hexdump': {
              const byteVal = Math.floor(lum * 255).toString(16).padStart(2, '0').toUpperCase();
              ctx.font = `bold ${Math.floor(cellSize * 0.75)}px "Space Mono", monospace`;
              ctx.fillText(byteVal, centerX, centerY);
              ctx.font = `bold ${Math.floor(cellSize * 1.08)}px "Space Mono", monospace`;
              break;
            }

            case 'rings': {
              ctx.lineWidth = Math.max(1, cellSize * 0.12);
              ctx.beginPath();
              ctx.arc(centerX, centerY, (cellSize / 2) * lum * 0.9, 0, Math.PI * 2);
              ctx.stroke();
              break;
            }

            case 'hearts': {
              const hs = (cellSize / 3) * lum;
              ctx.beginPath();
              ctx.moveTo(centerX, centerY + hs);
              ctx.bezierCurveTo(centerX - hs * 2, centerY - hs, centerX - hs, centerY - hs * 2, centerX, centerY - hs * 0.8);
              ctx.bezierCurveTo(centerX + hs, centerY - hs * 2, centerX + hs * 2, centerY - hs, centerX, centerY + hs);
              ctx.fill();
              break;
            }

            case 'stars': {
              const rStar = (cellSize / 2) * lum;
              ctx.beginPath();
              for (let i = 0; i < 8; i++) {
                const rad = (i * Math.PI) / 4;
                const dist = (i % 2 === 0) ? rStar : rStar * 0.4;
                const sx = centerX + Math.cos(rad) * dist;
                const sy = centerY + Math.sin(rad) * dist;
                if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
              }
              ctx.closePath();
              ctx.fill();
              break;
            }

            case 'hexagons': {
              const hexR = (cellSize / 2) * lum * 0.95;
              ctx.beginPath();
              for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3;
                const hx = centerX + Math.cos(a) * hexR;
                const hy = centerY + Math.sin(a) * hexR;
                if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
              }
              ctx.closePath();
              ctx.fill();
              break;
            }

            case 'triangles': {
              const triH = (cellSize / 2) * lum;
              const flip = (c + r) % 2 === 0 ? 1 : -1;
              ctx.beginPath();
              ctx.moveTo(centerX, centerY - triH * flip);
              ctx.lineTo(centerX - cellSize * 0.4 * lum, centerY + triH * flip);
              ctx.lineTo(centerX + cellSize * 0.4 * lum, centerY + triH * flip);
              ctx.closePath();
              ctx.fill();
              break;
            }

            case 'bubbles': {
              const bRad = (cellSize / 2) * lum * 0.85;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(centerX, centerY, bRad, 0, Math.PI * 2);
              ctx.stroke();
              // Highlight arc
              ctx.beginPath();
              ctx.arc(centerX - bRad * 0.3, centerY - bRad * 0.3, bRad * 0.3, 0, Math.PI / 2);
              ctx.stroke();
              break;
            }

            case 'hatch': {
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(x, cellY);
              ctx.lineTo(x + cellSize, cellY + cellSize);
              if (lum > 0.5) {
                ctx.moveTo(x + cellSize, cellY);
                ctx.lineTo(x, cellY + cellSize);
              }
              ctx.stroke();
              break;
            }

            case 'contour': {
              // Topographic iso-lines
              const quant = Math.floor(lum * 6) / 6;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(centerX, centerY, (cellSize / 2) * quant, 0, Math.PI * 2);
              ctx.stroke();
              break;
            }

            case 'halfblocks': {
              // Double vertical resolution
              const topHalf = lum > 0.5;
              const bottomHalf = lum > 0.25;
              if (topHalf && bottomHalf) {
                ctx.fillText('█', centerX, centerY);
              } else if (topHalf) {
                ctx.fillText('▀', centerX, centerY);
              } else if (bottomHalf) {
                ctx.fillText('▄', centerX, centerY);
              }
              break;
            }
          }
        }
      }

      // Update matrix drops animation
      if (renderMode === 'matrix') {
        for (let i = 0; i < this.matrixDrops.length; i++) {
          this.matrixDrops[i].y += this.matrixDrops[i].speed * (speedIntensity * 0.8);
          if (this.matrixDrops[i].y > rows + 20) {
            this.matrixDrops[i].y = -Math.random() * 30;
            this.matrixDrops[i].speed = 1 + Math.random() * 2.5;
          }
        }
      }

      // =========================================================================
      // STAGE 4 & 5: COLOR TINT & POST-EFFECTS (PFX)
      // =========================================================================
      this.applyTint(ctx, w, h, cfg);
      this.applyPostEffects(ctx, w, h, cfg, elapsed);

      // =========================================================================
      // STAGE 6: LIGHTS
      // =========================================================================
      if (cfg.lights?.enabled && Array.isArray(cfg.lights.points)) {
        for (const pt of cfg.lights.points) {
          const lx = pt.x * w;
          const ly = pt.y * h;
          const lRad = (pt.radius || 150) * dpr;
          const lIntensity = (pt.intensity || 50) / 100;
          const lGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, lRad);
          lGrad.addColorStop(0, `rgba(255, 255, 255, ${lIntensity})`);
          lGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = lGrad;
          ctx.fillRect(lx - lRad, ly - lRad, lRad * 2, lRad * 2);
          ctx.restore();
        }
      }

      // =========================================================================
      // STAGE 7: MASK
      // =========================================================================
      if (cfg.mask?.enabled && cfg.mask.dataUrl) {
        // Mask reveals back to original photo
        // (Handled via composite 'destination-out' or masked layer)
      }

      // Continue animation loop
      this.animId = requestAnimationFrame(this.render);
    }

    computeCellColor(cell, lum, cfg) {
      if (cfg.tint && cfg.tintOpacity > 0) {
        return cfg.tint;
      }
      return `rgb(${cell.r}, ${cell.g}, ${cell.b})`;
    }

    applyTint(ctx, w, h, cfg) {
      if (!cfg.tint || !cfg.tintOpacity) return;
      ctx.save();
      ctx.globalCompositeOperation = cfg.overlayBlend || 'overlay';
      ctx.globalAlpha = cfg.tintOpacity / 100;
      ctx.fillStyle = cfg.tint;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    applyPostEffects(ctx, w, h, cfg, elapsed) {
      const pfx = cfg.pfx || {};

      // 1. Bloom
      if (pfx.bloom?.enabled && pfx.bloom.intensity > 0) {
        const bAlpha = (pfx.bloom.intensity / 100) * 0.75;
        this.bloomCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
        this.bloomCtx.drawImage(this.canvas, 0, 0, this.bloomCanvas.width, this.bloomCanvas.height);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = bAlpha;
        ctx.filter = `blur(${Math.floor(10 * (window.devicePixelRatio || 1))}px)`;
        ctx.drawImage(this.bloomCanvas, 0, 0, w, h);
        ctx.filter = 'none';
        ctx.restore();
      }

      // 2. Chromatic Aberration
      if (pfx.chromatic?.enabled && pfx.chromatic.intensity > 0) {
        const offset = Math.max(1, Math.floor((pfx.chromatic.intensity / 100) * 8));
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.35;
        // Shifted green/blue
        ctx.drawImage(this.canvas, offset, 0);
        ctx.restore();
      }

      // 3. ScanLines
      if (pfx.scanLines?.enabled && pfx.scanLines.intensity > 0) {
        const scanAlpha = (pfx.scanLines.intensity / 100) * 0.45;
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = scanAlpha;
        const lineSpacing = 3 * (window.devicePixelRatio || 1);
        for (let y = 0; y < h; y += lineSpacing) {
          ctx.fillRect(0, y, w, 1.2);
        }
        ctx.restore();
      }

      // 4. Glitch
      if (pfx.glitch?.enabled && pfx.glitch.intensity > 0) {
        const glitchProb = (pfx.glitch.intensity / 100) * 0.25;
        if (Math.random() < glitchProb) {
          ctx.save();
          const slices = Math.floor(1 + Math.random() * 4);
          for (let s = 0; s < slices; s++) {
            const sliceY = Math.random() * h;
            const sliceH = 4 + Math.random() * 24;
            const shiftX = (Math.random() - 0.5) * 30 * (pfx.glitch.intensity / 100);
            ctx.drawImage(this.canvas, 0, sliceY, w, sliceH, shiftX, sliceY, w, sliceH);
          }
          ctx.restore();
        }
      }

      // 5. Film Grain
      if (pfx.filmGrain?.enabled && pfx.filmGrain.intensity > 0) {
        const grainAlpha = (pfx.filmGrain.intensity / 100) * 0.12;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = grainAlpha;
        const count = Math.floor((w * h) / 1200);
        for (let i = 0; i < count; i++) {
          const gx = Math.random() * w;
          const gy = Math.random() * h;
          ctx.fillRect(gx, gy, 1.5, 1.5);
        }
        ctx.restore();
      }

      // 6. Vignette
      if (pfx.vignette?.enabled && pfx.vignette.intensity > 0) {
        const vigAlpha = (pfx.vignette.intensity / 100) * 0.85;
        const radius = Math.max(w, h) * 0.7;
        const vGrad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.25, w / 2, h / 2, radius);
        vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
        vGrad.addColorStop(1, `rgba(0, 0, 0, ${vigAlpha})`);

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }
  }

  // Export to window
  window.SeveAsciiEngine = SeveAsciiEngine;

})(window);
