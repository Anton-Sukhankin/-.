import { createElement, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, RefObject } from 'react';
import { Tooltip } from 'radix-ui';
import styles from './OverflowText.module.css';

type TextTag = 'span' | 'p' | 'h2' | 'h3' | 'strong' | 'button';
type OverflowTextProps<Tag extends TextTag> = {
  as?: Tag;
  fullText: string | undefined;
  /** An existing keyboard target for descriptions inside or beside a link. */
  focusTarget?: RefObject<HTMLElement | null>;
} & Omit<ComponentPropsWithoutRef<Tag>, 'title'>;

/** Shows the shared tooltip only while the rendered text is actually clipped. */
export function OverflowText<Tag extends TextTag = 'span'>({ as, fullText, focusTarget, ...props }: OverflowTextProps<Tag>) {
  const ref = useRef<HTMLElement>(null);
  const [clipped, setClipped] = useState(false);
  const [open, setOpen] = useState(false);
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
      const next = visible && (horizontal || vertical);
      setClipped(next);
      if (!next) setOpen(false);
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
  const enabled = clipped && Boolean(fullText);
  useLayoutEffect(() => {
    const target = focusTarget?.current;
    if (!target || !enabled) return;
    const show = () => { if (target.matches(':focus-visible')) setOpen(true); };
    const hide = () => setOpen(false);
    target.addEventListener('focus', show);
    target.addEventListener('blur', hide);
    show();
    return () => {
      target.removeEventListener('focus', show);
      target.removeEventListener('blur', hide);
    };
  }, [enabled, focusTarget]);
  return <Tooltip.Provider delayDuration={350}>
    <Tooltip.Root open={enabled && open} onOpenChange={value=>setOpen(enabled && value)}>
      <Tooltip.Trigger asChild>
        {createElement(as ?? 'span', {...props,ref,'data-overflow-text':'','data-overflow-clipped':enabled || undefined})}
      </Tooltip.Trigger>
      {enabled && <Tooltip.Portal>
        <Tooltip.Content className={styles.tooltip} sideOffset={6} collisionPadding={8}>{fullText}</Tooltip.Content>
      </Tooltip.Portal>}
    </Tooltip.Root>
  </Tooltip.Provider>;
}
