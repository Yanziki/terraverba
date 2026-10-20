// Crop a photo to the 3:4 frame of a passport picture: drag to move, the
// slider (or the wheel) to zoom. Everything happens in the browser; the
// result is a small JPEG data URL, and the original file goes nowhere.
import { t } from '../i18n/index.js';

const W = 300;
const H = 400;
const OUT_W = 360;
const OUT_H = 480;

export function cropPhoto(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.onload = () => {
      const box = document.createElement('div');
      box.className = 'crop-modal';
      box.innerHTML = `<div class="crop-card" role="dialog" aria-modal="true">
        <h3>${t('meCropTitle')}</h3>
        <div class="crop-stage"><canvas width="${W * 2}" height="${H * 2}"></canvas><i class="crop-guide"></i></div>
        <input class="crop-zoom" type="range" min="1" max="4" step="0.01" value="1" aria-label="${t('meCropZoom')}">
        <p class="hint">${t('meCropHint')}</p>
        <div class="actions"><button class="btn ghost small" data-act="cancel">${t('meCropCancel')}</button><button class="btn small" data-act="ok">${t('meCropUse')}</button></div>
      </div>`;
      document.body.appendChild(box);
      const canvas = box.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const zoom = box.querySelector('.crop-zoom');
      // the smallest scale at which the photo still covers the frame
      const cover = Math.max(W / img.width, H / img.height);
      let k = 1;
      let x = 0;
      let y = 0;
      const clamp = () => {
        const s = cover * k;
        x = Math.min(0, Math.max(W - img.width * s, x));
        y = Math.min(0, Math.max(H - img.height * s, y));
      };
      const centre = () => {
        const s = cover * k;
        x = (W - img.width * s) / 2;
        y = (H - img.height * s) / 2;
      };
      const draw = () => {
        const s = cover * k;
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, x, y, img.width * s, img.height * s);
      };
      // zoom about the frame's centre
      const setZoom = (next) => {
        const s0 = cover * k;
        const cx = (W / 2 - x) / s0;
        const cy = (H / 2 - y) / s0;
        k = Math.min(4, Math.max(1, next));
        const s = cover * k;
        x = W / 2 - cx * s;
        y = H / 2 - cy * s;
        clamp();
        zoom.value = k;
        draw();
      };
      centre();
      draw();
      zoom.oninput = () => setZoom(+zoom.value);
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        setZoom(k * (e.deltaY < 0 ? 1.06 : 1 / 1.06));
      }, { passive: false });
      let drag = null;
      canvas.addEventListener('pointerdown', (e) => {
        drag = { px: e.clientX, py: e.clientY, x, y };
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const r = canvas.getBoundingClientRect();
        const f = W / r.width;
        x = drag.x + (e.clientX - drag.px) * f;
        y = drag.y + (e.clientY - drag.py) * f;
        clamp();
        draw();
      });
      canvas.addEventListener('pointerup', () => (drag = null));
      const done = (result) => {
        box.remove();
        URL.revokeObjectURL(url);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      };
      const onKey = (e) => e.key === 'Escape' && done(null);
      document.addEventListener('keydown', onKey);
      box.querySelector('[data-act=cancel]').onclick = () => done(null);
      box.addEventListener('click', (e) => e.target === box && done(null));
      box.querySelector('[data-act=ok]').onclick = () => {
        const out = document.createElement('canvas');
        out.width = OUT_W;
        out.height = OUT_H;
        const o = out.getContext('2d');
        const s = (cover * k * OUT_W) / W;
        o.drawImage(img, (x * OUT_W) / W, (y * OUT_H) / H, img.width * s, img.height * s);
        done(out.toDataURL('image/jpeg', 0.86));
      };
    };
    img.src = url;
  });
}
