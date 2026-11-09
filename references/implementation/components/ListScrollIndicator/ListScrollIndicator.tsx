import { useEffect, useRef, type RefObject } from 'react';
import styles from './ListScrollIndicator.module.css';

const listSelector = '[data-list-scroll]';
const idleDelay = 500;

function scrollGeometry(viewport: HTMLElement, area: HTMLElement) {
  const { clientHeight, scrollHeight, scrollTop } = viewport;
  if (!clientHeight || scrollHeight <= clientHeight) return;
  const box = viewport.getBoundingClientRect();
  const bounds = area.getBoundingClientRect();
  const top = Math.max(box.top, bounds.top);
  const bottom = Math.min(box.bottom, bounds.bottom, window.innerHeight);
  if (bottom <= top) return;

  const edge = Math.min(bounds.right, window.innerWidth);
  const surface = viewport.closest('[data-list-scroll-boundary]');
  const contentRight = viewport === area
    ? box.right - parseFloat(getComputedStyle(area).paddingRight)
    : surface?.getBoundingClientRect().right ?? box.right;
  const gutter = Math.min(edge - contentRight, viewport.dataset.listScroll === 'local' ? 16 : 24);
  const left = gutter >= 4 ? contentRight : edge - 12;
  const right = gutter >= 4 ? contentRight + gutter : edge;
  const length = bottom - top;
  const height = Math.min(length, Math.max(20, length * clientHeight / scrollHeight));
  const progress = Math.max(0, Math.min(1, scrollTop / (scrollHeight - clientHeight)));
  return { top, bottom, left, right, height, thumbTop: top + progress * (length - height) };
}

export function ListScrollIndicator({ area }: { area: RefObject<HTMLElement | null> }) {
  const layer = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = area.current;
    const overlay = layer.current;
    const line = thumb.current;
    if (!root || !overlay || !line) return;

    let pointer: { x: number; y: number } | undefined;
    let scrolling: HTMLElement | undefined;
    const wheelTargets = new Set<HTMLElement>();
    const scrollPositions = new WeakMap<HTMLElement, number>();
    let wheelTime = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let observed: HTMLElement | undefined;

    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        let viewport = scrolling && root.contains(scrolling) ? scrolling : undefined;
        let geometry = viewport && scrollGeometry(viewport, root);
        if (!geometry && pointer) {
          const { x, y } = pointer;
          const lists = Array.from(root.querySelectorAll<HTMLElement>(listSelector));
          if (root.matches(listSelector)) lists.push(root);
          for (const list of lists) {
            const track = scrollGeometry(list, root);
            if (track && x >= track.left && x < track.right && y >= track.top && y < track.bottom) {
              viewport = list;
              geometry = track;
              break;
            }
          }
        }
        if (geometry) {
          const bounds = overlay.getBoundingClientRect();
          line.style.left = `${(geometry.left + geometry.right - 3) / 2 - bounds.left}px`;
          line.style.top = `${geometry.thumbTop - bounds.top}px`;
          line.style.height = `${geometry.height}px`;
        }
        line.dataset.visible = String(Boolean(geometry));
        const nextObserved = geometry ? viewport : undefined;
        if (observed !== nextObserved) {
          resize.disconnect();
          if (nextObserved) resize.observe(nextObserved);
          observed = nextObserved;
        }
      });
    };
    const resize = new ResizeObserver(update);

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || !event.deltaY || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      wheelTime = performance.now();
      wheelTargets.clear();
      for (let node = event.target instanceof Element ? event.target.closest<HTMLElement>(listSelector) : null;
        node && root.contains(node); node = node.parentElement?.closest<HTMLElement>(listSelector) ?? null) {
        wheelTargets.add(node);
      }
    };

    function onScroll(event: Event) {
      if (pointer) update();
      const viewport = event.target;
      if (!(viewport instanceof HTMLElement) || !viewport.matches(listSelector)) return;
      const previous = scrollPositions.get(viewport) ?? 0;
      scrollPositions.set(viewport, viewport.scrollTop);
      if (previous === viewport.scrollTop || !wheelTargets.has(viewport) || performance.now() - wheelTime > idleDelay) return;
      scrolling = viewport;
      clearTimeout(timer);
      timer = setTimeout(() => { scrolling = undefined; update(); }, idleDelay);
      update();
    }

    function onPointerMove(event: PointerEvent) {
      pointer = event.pointerType === 'mouse' ? { x: event.clientX, y: event.clientY } : undefined;
      update();
    }

    function onPointerLeave() {
      pointer = undefined;
      update();
    }

    root.addEventListener('wheel', onWheel, { passive: true });
    root.addEventListener('scroll', onScroll, { capture: true, passive: true });
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', update);
    return () => {
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('scroll', onScroll, true);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', update);
      resize.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [area]);

  return <div ref={layer} className={styles.overlay} aria-hidden="true"><span ref={thumb} className={styles.thumb} data-list-scroll-thumb /></div>;
}
