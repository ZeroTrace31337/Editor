/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural high-fidelity image generators for CineFlow sample media
export function createCinematicThumbnail(type: 'man_bokeh' | 'sunset' | 'city_night' | 'forest' | 'drone' | 'waveform' | 'logo', width = 640, height = 360): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (type === 'man_bokeh') {
    // Warm cinematic night city bokeh background + man profile
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0c0d18');
    grad.addColorStop(0.5, '#1e142b');
    grad.addColorStop(1, '#2c131d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Warm glowing bokeh circles in background
    const bokehColors = ['rgba(249, 115, 22, 0.45)', 'rgba(234, 88, 12, 0.35)', 'rgba(236, 72, 153, 0.3)', 'rgba(168, 85, 247, 0.3)', 'rgba(251, 191, 36, 0.4)'];
    const bokehs = [
      { x: width * 0.75, y: height * 0.35, r: 65, c: bokehColors[0] },
      { x: width * 0.85, y: height * 0.55, r: 90, c: bokehColors[1] },
      { x: width * 0.65, y: height * 0.65, r: 50, c: bokehColors[4] },
      { x: width * 0.9, y: height * 0.25, r: 40, c: bokehColors[2] },
      { x: width * 0.55, y: height * 0.4, r: 75, c: bokehColors[3] },
      { x: width * 0.2, y: height * 0.7, r: 80, c: bokehColors[0] },
    ];
    bokehs.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.c;
      ctx.fill();
    });

    // Silhouette of handsome young man with curly hair and jacket rim lit by orange/amber bokeh
    const cx = width * 0.45;
    const cy = height * 0.55;

    // Body / shoulders / dark hoodie
    ctx.fillStyle = '#0f111a';
    ctx.beginPath();
    ctx.moveTo(cx - 180, height);
    ctx.quadraticCurveTo(cx - 90, cy + 90, cx - 40, cy + 50);
    ctx.lineTo(cx + 100, cy + 60);
    ctx.quadraticCurveTo(cx + 160, cy + 110, cx + 240, height);
    ctx.closePath();
    ctx.fill();

    // Head / neck / face profile
    ctx.fillStyle = '#b47055'; // warm skin tone
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 40); // neck left
    ctx.lineTo(cx + 45, cy + 40); // neck right
    ctx.lineTo(cx + 50, cy - 10); // jaw angle
    ctx.lineTo(cx + 70, cy - 25); // chin
    ctx.lineTo(cx + 68, cy - 38); // lips
    ctx.lineTo(cx + 78, cy - 48); // nose tip
    ctx.lineTo(cx + 62, cy - 65); // brow
    ctx.lineTo(cx + 50, cy - 85); // forehead
    ctx.lineTo(cx - 30, cy - 80); // back head
    ctx.lineTo(cx - 40, cy + 10); // neck back
    ctx.closePath();
    ctx.fill();

    // Curly dark hair
    ctx.fillStyle = '#110e17';
    for (let i = 0; i < 18; i++) {
      const hx = cx + Math.cos(i * 0.4) * 55 - 5;
      const hy = cy - 75 + Math.sin(i * 0.4) * 35;
      ctx.beginPath();
      ctx.arc(hx, hy, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Warm amber rim light on face and jaw
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + 50, cy - 85);
    ctx.lineTo(cx + 62, cy - 65);
    ctx.lineTo(cx + 78, cy - 48);
    ctx.lineTo(cx + 68, cy - 38);
    ctx.lineTo(cx + 70, cy - 25);
    ctx.stroke();

    // Subtle cool fill light on jacket
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 120, height);
    ctx.lineTo(cx - 40, cy + 50);
    ctx.stroke();

  } else if (type === 'sunset') {
    // Cinematic sunset over mountain ranges
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(0.35, '#831843');
    grad.addColorStop(0.65, '#ea580c');
    grad.addColorStop(1, '#facc15');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Glowing sun disk
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.65, 45, 0, Math.PI * 2);
    ctx.fillStyle = '#fffbeb';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 35;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Mountain layers
    ctx.fillStyle = '#4c0519';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.6);
    ctx.lineTo(width * 0.25, height * 0.45);
    ctx.lineTo(width * 0.55, height * 0.68);
    ctx.lineTo(width * 0.8, height * 0.48);
    ctx.lineTo(width, height * 0.62);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1c0714';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.75);
    ctx.lineTo(width * 0.35, height * 0.62);
    ctx.lineTo(width * 0.7, height * 0.78);
    ctx.lineTo(width, height * 0.68);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

  } else if (type === 'city_night') {
    // Glowing neon skyscrapers / city skyline
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#090a12');
    grad.addColorStop(0.7, '#14122e');
    grad.addColorStop(1, '#1e113a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Neon city buildings
    const colors = ['#38bdf8', '#c084fc', '#f43f5e', '#a855f7', '#06b6d4'];
    for (let x = 10; x < width - 10; x += 32) {
      const bHeight = 80 + Math.sin(x * 12.3) * 60 + (x % 70) * 1.5;
      const bColor = colors[Math.floor((x / 32) % colors.length)];
      ctx.fillStyle = '#0a0b16';
      ctx.fillRect(x, height - bHeight, 26, bHeight);

      // Windows
      ctx.fillStyle = bColor;
      for (let wy = height - bHeight + 8; wy < height - 10; wy += 14) {
        for (let wx = x + 4; wx < x + 22; wx += 6) {
          if (Math.sin(wx * 11 + wy * 7) > -0.2) {
            ctx.fillRect(wx, wy, 3, 5);
          }
        }
      }
    }

  } else if (type === 'forest') {
    // Lush green forest pathway
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#064e3b');
    grad.addColorStop(0.5, '#047857');
    grad.addColorStop(1, '#065f46');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Sun rays
    ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(width * 0.5 + i * 30, 0);
      ctx.lineTo(width * 0.2 + i * 60, height);
      ctx.lineTo(width * 0.28 + i * 60, height);
      ctx.lineTo(width * 0.55 + i * 30, 0);
      ctx.fill();
    }

    // Tall dark trees
    ctx.fillStyle = '#022c22';
    for (let i = 0; i < 12; i++) {
      const tx = 20 + i * (width / 11);
      const tw = 12 + (i % 4) * 4;
      ctx.fillRect(tx, 0, tw, height);
    }

  } else if (type === 'drone') {
    // Coastal ocean and tropical turquoise beach road
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#06b6d4');
    grad.addColorStop(0.7, '#2dd4bf');
    grad.addColorStop(1, '#fef08a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Mountain coastline
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width * 0.45, 0);
    ctx.quadraticCurveTo(width * 0.5, height * 0.6, 0, height);
    ctx.closePath();
    ctx.fill();

    // Winding coastline road
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.85);
    ctx.quadraticCurveTo(width * 0.38, height * 0.5, width * 0.35, 0);
    ctx.stroke();

  } else if (type === 'waveform') {
    // Neon purple/cyan audio waveform
    ctx.fillStyle = '#090a14';
    ctx.fillRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.5, '#a855f7');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;

    const bars = 48;
    const barWidth = width / bars;
    for (let i = 0; i < bars; i++) {
      const val = Math.abs(Math.sin(i * 0.35) * 0.8 + Math.cos(i * 0.7) * 0.4);
      const bHeight = Math.max(8, val * (height * 0.75));
      ctx.fillRect(i * barWidth + 2, (height - bHeight) / 2, barWidth - 4, bHeight);
    }

  } else if (type === 'logo') {
    // CineFlow vibrant logo
    ctx.fillStyle = '#090b14';
    ctx.fillRect(0, 0, width, height);

    // Vibrant 3D gradient triangle
    const cx = width / 2;
    const cy = height / 2;
    const size = height * 0.45;

    const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.4, '#a855f7');
    grad.addColorStop(0.8, '#ec4899');
    grad.addColorStop(1, '#f97316');

    ctx.beginPath();
    ctx.moveTo(cx - size * 0.6, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx - size * 0.6, cy + size);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}
