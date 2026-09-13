// Measure the actual control height, including text wrapping and safe areas,
// instead of reserving a fixed number of pixels over the camera scene.
export function setupMobileLayout() {
  const root = document.documentElement;
  const footer = document.querySelector<HTMLElement>('.footer')!;
  const controls = document.querySelector<HTMLElement>('#demo-controls')!;
  const header = document.querySelector<HTMLElement>('.topbar')!;
  const coach = document.querySelector<HTMLElement>('.live-coach')!;
  let scheduled = 0;
  const update = () => {
    scheduled = 0;
    root.style.setProperty('--footer-height', `${Math.ceil(footer.getBoundingClientRect().height)}px`);
    root.style.setProperty('--demo-height', `${Math.ceil(controls.getBoundingClientRect().height)}px`);
    root.style.setProperty('--header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
    root.style.setProperty('--coach-height', `${Math.ceil(coach.getBoundingClientRect().height)}px`);
  };
  const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(update); };
  const observer = new ResizeObserver(schedule);
  for (const element of [footer, controls, header, coach]) observer.observe(element);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  update();
}
