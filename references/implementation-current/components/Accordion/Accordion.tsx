import { useId, useState } from 'react';
import { DescriptionText } from '../DescriptionText/DescriptionText';
import type { ReactNode } from 'react';
import s from './Accordion.module.css';

export interface AccordionProps {
  title: ReactNode;
  description?: string;
  /** Non-interactive metadata under the title; preserves the shared disclosure behavior. */
  metadata?: ReactNode;
  inlineMetadata?: ReactNode;
  count?: number | string;
  icon?: ReactNode;
  action?: ReactNode;
  wrapAction?: boolean;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: 'report' | 'metric';
  chevronSize?: 32 | 40;
  /** Custom icon depicts the closed state; the shared wrapper rotates it when open. */
  chevronIcon?: ReactNode;
  /** Static sections share the same header/body styles without a disclosure button. */
  collapsible?: boolean;
  leadingIcon?: ReactNode;
  bodyInset?: 'default' | 'table' | 'flush';
}

/** The panel can own its state or receive open/onOpenChange from its parent. */
export function Accordion({ title, description, metadata, inlineMetadata, count, icon, children, open: controlledOpen, defaultOpen = true, onOpenChange, action, wrapAction = false, variant = 'report', chevronSize = 32, chevronIcon, collapsible = true, leadingIcon, bodyInset = 'default' }: AccordionProps) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? localOpen;
  const id = useId();
  function toggle() {
    if (controlledOpen === undefined) setLocalOpen(!open);
    onOpenChange?.(!open);
  }
  const heading = <span className={s.heading}><strong>{title}</strong>{description && <small><DescriptionText text={description} /></small>}{metadata && <span className={s.metadata}>{metadata}</span>}</span>;
  const trailing = <>{icon && <span className={s.icon} aria-hidden="true">{icon}</span>}{!action && count !== undefined && <span className={typeof count === 'number' ? s.count : s.muted}>{count}</span>}</>;
  return <section className={s.accordion} data-variant={variant} data-chevron-size={chevronSize} data-collapsible={collapsible}
    data-wrap-action={wrapAction && action ? true : undefined}>
    <div className={s.top}>
      {collapsible ? <button type="button" className={s.header} aria-expanded={open} aria-controls={id} onClick={toggle}>
        <span className={s.chevron} aria-hidden="true"><span className={s.chevronIcon} data-open={open}>{chevronIcon ?? <span className={s.dsChevron} />}</span></span>
        {heading}{inlineMetadata}{trailing}
      </button> : <div className={`${s.header} ${s.staticHeader}`}>
        {leadingIcon && <span className={s.staticIcon} aria-hidden="true">{leadingIcon}</span>}{heading}{inlineMetadata}{trailing}
      </div>}
      {action && <div className={s.action}>{action}</div>}
      {action && count !== undefined && <span className={s.trailingCount}><span className={typeof count === 'number' ? s.count : s.muted}>{count}</span></span>}
    </div>
    {collapsible ? <div className={s.reveal} data-open={open} aria-hidden={!open} inert={!open}>
      <div className={s.clip}>
        <div id={id} data-accordion-body className={`${s.body} ${bodyInset === 'table' ? s.tableBody : bodyInset === 'flush' ? s.flushBody : ''}`}>{children}</div>
      </div>
    </div> : <div id={id} data-accordion-body className={`${s.body} ${bodyInset === 'table' ? s.tableBody : bodyInset === 'flush' ? s.flushBody : ''}`}>{children}</div>}
  </section>;
}
