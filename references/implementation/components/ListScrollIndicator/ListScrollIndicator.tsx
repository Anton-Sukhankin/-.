import { useEffect, useRef, type RefObject } from 'react';
import styles from './ListScrollIndicator.module.css';

const idleDelay = 500;
const thumbWidth = 3;

function scrollGeometry(viewport: HTMLElement) {
  const { clientHeight, scrollHeight, scrollTop } = viewport;
  if (!clientHeight || scrollHeight <= clientHeight) return;

  const documentViewport = viewport === document.scrollingElement;
  const box = viewport.getBoundingClientRect();
  let top = documentViewport ? 0 : Math.max(0, box.top);
  let bottom = documentViewport ? window.innerHeight : Math.min(window.innerHeight, box.bottom);

  for (let parent = viewport.parentElement; !documentViewport && parent && parent !== document.body; parent = parent.parentElement) {
    if (getComputedStyle(parent).overflowY !== 'visible') {
      const clip = parent.getBoundingClientRect();
      top = Math.max(top, clip.top);
      bottom = Math.min(bottom, clip.bottom);
    }
    if (parent === document.fullscreenElement || parent.matches('dialog[open]')) break;
  }
  if (bottom <= top) return;

  const workspace = viewport.closest<HTMLElement>('[data-catalog-screen]');
  const popup = viewport.closest('[data-dropdown-surface="true"], [data-single-select-popup], dialog');
  const edge = Math.min(window.innerWidth, documentViewport ? window.innerWidth : box.right);
  let left = edge - 8;
  if (popup) {
    const gap = Math.min(window.innerWidth, popup.getBoundingClientRect().right) - edge;
    if (gap >= thumbWidth + 4) left = edge + (gap - thumbWidth) / 2;
  } else if (workspace && viewport.hasAttribute('data-list-scroll')) {
    const workspaceRight = Math.min(workspace.getBoundingClientRect().right, window.innerWidth);
    const surface = viewport.closest('[data-list-scroll-boundary]');
    const contentRight = viewport === workspace
      ? box.right - parseFloat(getComputedStyle(workspace).paddingRight)
      : surface?.getBoundingClientRect().right ?? box.right;
    const gutter = Math.min(workspaceRight - contentRight, viewport.dataset.listScroll === 'local' ? 16 : 24);
    left = gutter >= 4 ? contentRight + (gutter - thumbWidth) / 2 : workspaceRight - (12 + thumbWidth) / 2;
  }

  const length = bottom - top;
  const height = Math.min(length, Math.max(20, length * clientHeight / scrollHeight));
  const progress = Math.max(0, Math.min(1, scrollTop / (scrollHeight - clientHeight)));
  return { left, height, top: top + progress * (length - height) };
}

export function ListScrollIndicator({ scope }: { scope?: RefObject<HTMLElement | null> }) {
  const thumb = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = scope ? scope.current : document;
    const line = thumb.current;
    if (!root || !line) return;

    let viewport: HTMLElement | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const positions = new WeakMap<HTMLElement, number>();

    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const geometry = viewport?.isConnected && scrollGeometry(viewport);
        if (geometry) {
          line.style.left = `${geometry.left}px`;
          line.style.top = `${geometry.top}px`;
          line.style.height = `${geometry.height}px`;
        }
        line.dataset.visible = String(Boolean(geometry));
      });
    };
    const resize = new ResizeObserver(update);

    function onScroll(event: Event) {
      const element = event.target === document ? document.scrollingElement : event.target;
      if (!(element instanceof HTMLElement)) return;
      const previous = positions.get(element) ?? 0;
      positions.set(element, element.scrollTop);
      if (previous === element.scrollTop) return;
      // Top-layer surfaces paint their own indicator.
      if (!scope && (element.closest('dialog[open]') || document.fullscreenElement?.contains(element))) return;
      if (element !== document.scrollingElement && !/^(auto|scroll|overlay)$/.test(getComputedStyle(element).overflowY)) return;
      if (element.scrollHeight <= element.clientHeight) return;

      if (viewport !== element) {
        viewport = element;
        resize.disconnect();
        resize.observe(element);
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        viewport = undefined;
        resize.disconnect();
        update();
      }, idleDelay);
      update();
    }

    root.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', update);
    return () => {
      root.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', update);
      resize.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [scope]);

  return <span ref={thumb} className={styles.thumb} aria-hidden="true" data-list-scroll-thumb />;
}
