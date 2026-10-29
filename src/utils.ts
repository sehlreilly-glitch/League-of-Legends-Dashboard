export function darkenColor(color: string, percent: number): string {
  if (!color) return '#a38f58';
  let hex = color.replace(/^#/, '');

  if (hex.length === 3) {
    hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
  }

  if (hex.length !== 6) return '#a38f58';

  let R = parseInt(hex.substring(0, 2), 16);
  let G = parseInt(hex.substring(2, 4), 16);
  let B = parseInt(hex.substring(4, 6), 16);

  R = Math.floor(R * (1 - percent / 100));
  G = Math.floor(G * (1 - percent / 100));
  B = Math.floor(B * (1 - percent / 100));

  R = (R < 0) ? 0 : R;
  G = (G < 0) ? 0 : G;
  B = (B < 0) ? 0 : B;

  const RR = (R.toString(16).length === 1) ? '0' + R.toString(16) : R.toString(16);
  const GG = (G.toString(16).length === 1) ? '0' + G.toString(16) : G.toString(16);
  const BB = (B.toString(16).length === 1) ? '0' + B.toString(16) : B.toString(16);

  return '#' + RR + GG + BB;
}

export function getContrastColor(hex: string): string {
  if (!hex) return '#a38f58';

  // Remove '#' if present
  hex = hex.replace(/^#/, '');

  // Parse RGB
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return '#a38f58';
  }

  // Calculate luminance (standard formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // The app's theme is dark. So if the text color is too dark (luminance < 0.3),
  // we either lighten it or fallback to white/gold. Let's lighten it.
  if (luminance < 0.3) {
    // Lighten the color by blending with white or use a threshold logic
    // We'll just return a brighter version.
    return lightenColor(`#${hex}`, 50);
  } else if (luminance > 0.9) {
    // If it's too light, we maybe darken slightly or just leave it. Since it's a dark theme,
    // light colors are actually better. We'll leave it unless it's practically invisible.
    return `#${hex}`;
  }

  return `#${hex}`;
}

function lightenColor(color: string, percent: number) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = R + Math.floor((255 - R) * (percent / 100));
  G = G + Math.floor((255 - G) * (percent / 100));
  B = B + Math.floor((255 - B) * (percent / 100));

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  const RR = (R.toString(16).length === 1) ? '0' + R.toString(16) : R.toString(16);
  const GG = (G.toString(16).length === 1) ? '0' + G.toString(16) : G.toString(16);
  const BB = (B.toString(16).length === 1) ? '0' + B.toString(16) : B.toString(16);

  return '#' + RR + GG + BB;
}
