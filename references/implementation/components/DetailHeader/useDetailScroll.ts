import { useLayoutEffect, useRef, useState } from 'react';
import type { UIEvent } from 'react';

export function useDetailScroll(section?: string) {
  const scroll = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
    setCompact(false);
  }, [section]);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const { target, currentTarget } = event;
    if (!(target instanceof HTMLElement)) return;
    if (target !== currentTarget && !target.hasAttribute('data-detail-scroll-source')) return;
    setCompact(target.scrollTop > 0);
  }

  return { compact, scroll, onScroll };
}
