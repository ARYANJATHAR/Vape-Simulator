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

// Virtual flavor presets, not real products. See FLAVOR-RESEARCH.md for the
// category-level evidence; these individual names are representative choices.
export const THEMES: readonly StudioTheme[] = [
  { id: 'mango', name: 'Mango', note: 'Fruit · golden orange', accent: '#c58a32', pale: '#ffe0a4', body: ['#76501e','#dfae5a','#b17b32'], vapor: [250,222,171], backdrop: ['#292e38','#15191f','#0e1015'], life: 1, growth: 1, curl: 1, lift: 1, density: 1 },
  { id: 'mixed-berry', name: 'Mixed Berry', note: 'Fruit · berry violet', accent: '#9270bc', pale: '#e4d5fa', body: ['#51406a','#b79acd','#8970a9'], vapor: [222,203,250], backdrop: ['#292e38','#15191f','#0e1015'], life: 1, growth: .95, curl: 1.15, lift: 1, density: 1 },
  { id: 'watermelon', name: 'Watermelon', note: 'Fruit · watermelon pink', accent: '#bf687f', pale: '#ffd7e1', body: ['#743d50','#d991a8','#ac687f'], vapor: [250,208,221], backdrop: ['#292e38','#15191f','#0e1015'], life: 1, growth: 1, curl: 1, lift: 1, density: 1 },
  { id: 'mint', name: 'Mint', note: 'Mint · fresh green', accent: '#6f9c7d', pale: '#d3f1de', body: ['#39594a','#98c5a8','#6b987f'], vapor: [207,242,220], backdrop: ['#292e38','#15191f','#0e1015'], life: .95, growth: .95, curl: 1, lift: 1.1, density: 1 },
  { id: 'menthol', name: 'Menthol', note: 'Menthol · icy blue', accent: '#639ead', pale: '#d8f6ff', body: ['#325c6b','#94cfdb','#639daa'], vapor: [209,239,250], backdrop: ['#292e38','#15191f','#0e1015'], life: .95, growth: .95, curl: .9, lift: 1.1, density: 1 },
  { id: 'mango-ice', name: 'Mango Ice', note: 'Mixed ice · pale turquoise', accent: '#6baba4', pale: '#def4e5', body: ['#345f62','#a1d5c5','#6ca9a2'], vapor: [220,246,225], backdrop: ['#292e38','#15191f','#0e1015'], life: 1, growth: 1, curl: 1.1, lift: 1.05, density: 1 },
  { id: 'vanilla', name: 'Vanilla', note: 'Dessert · cream gold', accent: '#b5a27a', pale: '#fff0cf', body: ['#71634c','#d6c6a2','#ab9875'], vapor: [249,238,213], backdrop: ['#292e38','#15191f','#0e1015'], life: 1.05, growth: 1, curl: .95, lift: 1, density: 1 },
  { id: 'tobacco', name: 'Tobacco', note: 'Tobacco · warm bronze', accent: '#a47b56', pale: '#e8ceb1', body: ['#634735','#ba9672','#946e4d'], vapor: [235,217,196], backdrop: ['#292e38','#15191f','#0e1015'], life: 1, growth: 1, curl: 1, lift: 1, density: 1 },
];

const legacyFlavors: Record<string, string> = { slate: 'menthol', glacier: 'menthol', rose: 'watermelon', amber: 'mango', meadow: 'mint', violet: 'mixed-berry' };

export function getTheme(id: string | null | undefined): StudioTheme {
  const mapped = id ? legacyFlavors[id] ?? id : undefined;
  return THEMES.find(theme => theme.id === mapped) ?? THEMES[0];
}

export function savedTheme() {
  try { return getTheme(localStorage.getItem('online-vape.flavor') ?? localStorage.getItem('vape-studio.theme')); }
  catch { return THEMES[0]; }
}

export function rememberTheme(theme: StudioTheme) {
  try { localStorage.setItem('online-vape.flavor', theme.id); } catch { /* Storage is optional. */ }
}

export function rgba(rgb: [number, number, number], alpha: number) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}
