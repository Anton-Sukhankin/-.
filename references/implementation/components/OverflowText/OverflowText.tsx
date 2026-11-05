import { createElement, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

type TextTag = 'span' | 'p' | 'h2' | 'h3' | 'strong' | 'button';
type OverflowTextProps<Tag extends TextTag> = { as?: Tag; fullText: string | undefined } & Omit<ComponentPropsWithoutRef<Tag>, 'title'>;

/** A native text tooltip exists only while the rendered text is actually clipped. */
export function OverflowText<Tag extends TextTag = 'span'>({ as, fullText, ...props }: OverflowTextProps<Tag>) {
  const ref = useRef<HTMLElement>(null);
  const [clipped, setClipped] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let active = true;
    const measure = () => {
      if (!active) return;
      const visible = element.clientWidth > 0 && element.clientHeight > 0;
      const style = getComputedStyle(element);
      const horizontal = element.scrollWidth > element.clientWidth;
      const clampsLines = Number.parseInt(style.webkitLineClamp, 10) > 0;
      // A one-line font can paint beyond its line box without text truncation.
      const vertical = (clampsLines || (style.whiteSpace !== 'nowrap' && ['hidden', 'clip'].includes(style.overflowY))) && element.scrollHeight > element.clientHeight + 1;
      setClipped(visible && (horizontal || vertical));
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    const content = new MutationObserver(measure);
    content.observe(element, { childList: true, characterData: true, subtree: true });
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener('loadingdone', measure);
    return () => { active = false; resize.disconnect(); content.disconnect(); document.fonts.removeEventListener('loadingdone', measure); };
  }, [fullText, as]);
  return createElement(as ?? 'span', { ...props, ref, 'data-overflow-text': '', title: clipped && fullText ? fullText : undefined });
}
