export interface StudioTheme {
  id: string;
  name: string;
  note: string;
  accent: string;
  pale: string;
  body: [string, string, string];
  vapor: [number, number, number];
  backdrop: [string, string, string];
  life: number;
  growth: number;
  curl: number;
  lift: number;
  density: number;
}

export const THEMES: readonly StudioTheme[] = [
  { id: 'slate', name: 'Slate', note: 'Soft clouds. The original.', accent: '#61738d', pale: '#d7e4ed', body: ['#394762','#7c8baa','#657596'], vapor: [227,237,249], backdrop: ['#b1b4c3','#868ca2','#626c84'], life: 1, growth: 1, curl: 1, lift: 1, density: 1 },
  { id: 'glacier', name: 'Glacier', note: 'Cool blue. A lighter drift.', accent: '#3b7484', pale: '#d4f0f1', body: ['#264f62','#82bdc9','#49899c'], vapor: [154,225,237], backdrop: ['#acc6cc','#769eae','#527788'], life: .85, growth: .9, curl: .7, lift: 1.5, density: .9 },
  { id: 'rose', name: 'Rose', note: 'Blush tones. A slow swirl.', accent: '#96607a', pale: '#f1dde7', body: ['#67455e','#c898b1','#a1728d'], vapor: [239,173,211], backdrop: ['#c9b6c4','#a08b9e','#766479'], life: 1.2, growth: .85, curl: 1.35, lift: .75, density: 1 },
  { id: 'amber', name: 'Amber', note: 'Golden light. Wider clouds.', accent: '#956b35', pale: '#f1e3c6', body: ['#695139','#c5a46d','#a88a55'], vapor: [245,208,142], backdrop: ['#cbc1ac','#a59b89','#7a715f'], life: 1, growth: 1.35, curl: .85, lift: .9, density: 1.1 },
  { id: 'meadow', name: 'Meadow', note: 'Fresh green. A gentle lift.', accent: '#597658', pale: '#e0ebd8', body: ['#3d5847','#9bb698','#708e73'], vapor: [185,224,165], backdrop: ['#b9c7b8','#8e9f92','#63776d'], life: 1.05, growth: 1, curl: 1.2, lift: 1.2, density: .95 },
  { id: 'violet', name: 'Violet', note: 'Lavender haze. A longer fade.', accent: '#76608e', pale: '#e7def1', body: ['#4d405f','#ac98c6','#8772a0'], vapor: [200,179,241], backdrop: ['#c0b7cf','#968aa9','#6b5e7e'], life: 1.3, growth: .9, curl: 1.5, lift: .7, density: 1.05 },
];

export function getTheme(id: string | null | undefined): StudioTheme {
  return THEMES.find(theme => theme.id === id) ?? THEMES[0];
}

export function savedTheme() {
  try { return getTheme(localStorage.getItem('vape-studio.theme')); }
  catch { return THEMES[0]; }
}

export function rememberTheme(theme: StudioTheme) {
  try { localStorage.setItem('vape-studio.theme', theme.id); } catch { /* Storage is optional. */ }
}

export function rgba(rgb: [number, number, number], alpha: number) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}
