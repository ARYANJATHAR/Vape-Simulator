import type { Scene } from './scene';
import { getTheme, rememberTheme, savedTheme, THEMES } from './themes';

let adultConsent = false;
export function hasAdultConsent() { return adultConsent; }

export function setupInterface(scene: Scene) {
  const age = document.querySelector<HTMLElement>('#age-screen')!;
  const ready = document.querySelector<HTMLElement>('#ready-screen')!;
  const denied = document.querySelector<HTMLElement>('#age-denied')!;
  try { adultConsent = sessionStorage.getItem('vape-studio.adult') === 'yes'; } catch { /* Consent can stay in memory. */ }
  age.hidden = adultConsent; ready.hidden = !adultConsent;
  document.querySelector('#age-yes')!.addEventListener('click', () => {
    adultConsent = true;
    try { sessionStorage.setItem('vape-studio.adult', 'yes'); } catch { /* Optional. */ }
    age.hidden = true; ready.hidden = false;
    document.querySelector<HTMLButtonElement>('#start-camera')!.focus({ preventScroll: true });
  });
  document.querySelector('#age-no')!.addEventListener('click', () => {
    adultConsent = false;
    age.hidden = true; ready.hidden = true; denied.hidden = false;
    denied.focus({ preventScroll: true });
  });

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const toast = document.querySelector<HTMLElement>('#theme-toast')!;
  function chooseTheme(id: string, announce = true) {
    const theme = getTheme(id);
    scene.setTheme(theme);
    rememberTheme(theme);
    document.documentElement.style.setProperty('--slate', theme.accent);
    document.documentElement.style.setProperty('--theme-pale', theme.pale);
    document.querySelectorAll<HTMLElement>('[data-current-theme]').forEach(label => { label.textContent = theme.name; });
    document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.theme === theme.id));
    });
    if (announce) {
      clearTimeout(toastTimer);
      toast.textContent = `${theme.name} selected. ${theme.note}`;
      toast.hidden = false;
      toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
    }
  }
  chooseTheme(savedTheme().id, false);
  const themeDialog = document.querySelector<HTMLDialogElement>('#theme-dialog')!;
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button => {
    button.addEventListener('click', () => { chooseTheme(button.dataset.theme!); themeDialog.close(); });
  });
  document.querySelector('#theme-random')!.addEventListener('click', () => {
    const choices = THEMES.filter(theme => theme.id !== scene.theme.id);
    chooseTheme(choices[Math.floor(Math.random() * choices.length)].id);
    themeDialog.close();
  });

  let opener: HTMLElement | null = null;
  const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog');
  document.querySelectorAll<HTMLButtonElement>('[data-open-dialog]').forEach(button => {
    button.addEventListener('click', () => {
      if (document.querySelector('dialog[open]')) return;
      const dialog = document.getElementById(button.dataset.openDialog!) as HTMLDialogElement | null;
      if (!dialog) return;
      opener = button;
      dialog.showModal();
      scene.paused = true;
      button.setAttribute('aria-expanded', 'true');
      if (dialog === themeDialog) dialog.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    });
  });
  dialogs.forEach(dialog => {
    dialog.addEventListener('close', () => {
      scene.paused = false;
      opener?.setAttribute('aria-expanded', 'false');
      opener?.focus({ preventScroll: true });
      opener = null;
    });
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  });
}
