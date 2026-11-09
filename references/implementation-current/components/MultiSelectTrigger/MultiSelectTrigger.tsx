import { AttributeValue } from '../AttributeValue/AttributeValue';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { X } from 'lucide-react';
import { DropdownItem } from '../DropdownItem/DropdownItem';
import { OverflowText } from '../OverflowText/OverflowText';
import { SelectClearButton } from '../SelectClearButton/SelectClearButton';
import type { FilterValueOption } from '../FilterValueList/FilterValueList';
import { packTags, type PackedTags } from './packTags';
import s from './MultiSelectTrigger.module.css';

interface Props {
  label: string;
  labelId: string;
  valueId: string;
  fieldId: string;
  items: readonly FilterValueOption[];
  emptyLabel: string;
  open: boolean;
  className: string;
  chevron: string;
  onOpen: (anchor: HTMLButtonElement) => void;
  onRemove: (value: string) => void;
  onClear: () => void;
}

/** A composite field: the select trigger and counter are sibling buttons. */
export function MultiSelectTrigger({ label, labelId, valueId, fieldId, items, emptyLabel, open, className, chevron, onOpen, onRemove, onClear }: Props) {
  const popupId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const rail = useRef<HTMLSpanElement>(null);
  const measureRoot = useRef<HTMLSpanElement>(null);
  const counter = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const restoringFocus = useRef(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [packing, setPacking] = useState<PackedTags>({ visibleCount: items.length, lastWidth: Infinity });
  const [summaryOpen, setSummaryOpen] = useState(false);
  const visible = items.slice(0, packing.visibleCount);
  const hidden = items.slice(packing.visibleCount);
  const hiddenCount = hidden.length;
  const previewOpen = summaryOpen && !open && hiddenCount > 0;

  useLayoutEffect(() => {
    setContainer(trigger.current?.closest<HTMLElement>('[data-report-filter-panel]') ?? null);
  }, []);
  useLayoutEffect(() => {
    let active = true;
    function measure() {
      if (!active || !rail.current || !measureRoot.current) return;
      const widths = Array.from(measureRoot.current.querySelectorAll('[data-tag-measure]')).map(node => node.getBoundingClientRect().width);
      const counts = [0, ...Array.from(measureRoot.current.querySelectorAll('[data-count-measure]')).map(node => node.getBoundingClientRect().width)];
      const next = packTags(rail.current.clientWidth, widths, counts, 44);
      setPacking(previous => previous.visibleCount === next.visibleCount && previous.lastWidth === next.lastWidth ? previous : next);
    }
    measure();
    const observer = new ResizeObserver(measure);
    if (rail.current) observer.observe(rail.current);
    if (measureRoot.current) observer.observe(measureRoot.current);
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener('loadingdone', measure);
    return () => { active = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone', measure); };
  }, [items]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const keepOpen = () => { clearTimeout(closeTimer.current); };
  function requestClose() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!popup.current?.contains(document.activeElement) && document.activeElement !== counter.current) setSummaryOpen(false);
    }, 160);
  }
  function remove(value: string, index: number) {
    onRemove(value);
    requestAnimationFrame(() => {
      const buttons = popup.current?.querySelectorAll<HTMLButtonElement>('button');
      if (buttons?.length) buttons[Math.min(index, buttons.length - 1)].focus();
      else {
        setSummaryOpen(false);
        (counter.current ?? trigger.current)?.focus();
      }
    });
  }
  function removeTag(value: string, index: number) {
    setSummaryOpen(false);
    onRemove(value);
    requestAnimationFrame(() => {
      const buttons = rail.current?.querySelectorAll<HTMLButtonElement>('[data-selected-tag-remove]');
      if (buttons?.length) buttons[Math.min(index, buttons.length - 1)].focus();
      else trigger.current?.focus();
    });
  }

  return <Popover.Root open={previewOpen} onOpenChange={setSummaryOpen} modal={false}>
    <div className={s.control} data-multi-select={fieldId} data-has-selection={items.length > 0}>
      <button ref={trigger} type="button" className={`${className} ${s.trigger}`} aria-labelledby={`${labelId} ${valueId}`} aria-haspopup="dialog" aria-expanded={open}
        data-panel-field={fieldId} onClick={event => { setSummaryOpen(false); onOpen(event.currentTarget); }}>
        <span id={valueId} className={s.srOnly}>{items.length ? items.map(item => item.label).join(', ') : emptyLabel}</span>
        <img src={chevron} width="16" height="16" alt="" aria-hidden="true" />
      </button>
      <span ref={rail} className={s.values}>
        {!items.length && <span className={s.empty} aria-hidden="true">{emptyLabel}</span>}
        {visible.map((item, index) => <span className={s.tag} data-selected-tag={item.value} key={item.value} style={index === visible.length - 1 && Number.isFinite(packing.lastWidth) ? { maxWidth: packing.lastWidth } : undefined}>
          <OverflowText fullText={item.label} aria-hidden="true" onClick={()=>trigger.current?.click()}><AttributeValue value={item.label} /></OverflowText>
          <button type="button" className={s.tagRemove} data-selected-tag-remove aria-label={`Удалить тег ${label}: ${item.label}`} onClick={event => { event.stopPropagation(); removeTag(item.value, index); }}><X size={12} strokeWidth={1.5} aria-hidden="true" /></button>
        </span>)}
      {hiddenCount > 0 && <Popover.Anchor asChild>
        <button ref={counter} type="button" className={`${s.tag} ${s.counter}`} data-multi-select-counter aria-label={`Ещё выбрано: ${hiddenCount}. ${label}`} aria-haspopup="dialog" aria-expanded={previewOpen} aria-controls={previewOpen ? popupId : undefined} disabled={open}
          onMouseEnter={() => { keepOpen(); if (!open) setSummaryOpen(true); }} onMouseLeave={requestClose} onFocus={() => { if (!restoringFocus.current) setSummaryOpen(true); }} onClick={() => { keepOpen(); setSummaryOpen(true); }}
          onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setSummaryOpen(true); requestAnimationFrame(() => popup.current?.querySelector<HTMLButtonElement>('button')?.focus()); } }}>
          +{hiddenCount}
        </button>
      </Popover.Anchor>}
      </span>
      {items.length > 0 && <SelectClearButton label={label} trigger={trigger} multiple onClear={() => { setSummaryOpen(false); onClear(); }} />}
      <span ref={measureRoot} className={s.measure} aria-hidden="true"><span className={s.measureRow}>
        {items.map(item => <span className={s.tag} data-tag-measure key={item.value}><span>{item.label}</span><span className={s.tagRemove}><X size={12} strokeWidth={1.5} /></span></span>)}
        {items.map((item, index) => <span className={s.tag} data-count-measure key={item.value}>+{index + 1}</span>)}
      </span></span>
    </div>
    <Popover.Portal container={container}>
      <Popover.Content id={popupId} ref={popup} className={s.popup} sideOffset={8} collisionPadding={8} align="end" data-multi-selected-popup data-dropdown-surface="true" aria-label={`Скрытые выбранные значения: ${label}`}
        onMouseEnter={keepOpen} onMouseLeave={requestClose} onEscapeKeyDown={event => { event.stopPropagation(); restoringFocus.current = true; counter.current?.focus(); restoringFocus.current = false; }}
        onInteractOutside={event => { if (event.target instanceof Node && counter.current?.contains(event.target)) event.preventDefault(); }}
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}>
        <div role="list" aria-label={`Скрыто: ${hiddenCount}`} className={s.selectedList}>
          {hidden.map((item, index) => <DropdownItem as="div" role="listitem" className={s.selectedRow} key={item.value}>
            <span className={s.selectedLabel}><AttributeValue value={item.label} /></span>
            <button type="button" className={s.remove} aria-label={`Удалить ${label}: ${item.label}`} onClick={() => remove(item.value, index)}><X size={12} strokeWidth={1.5} aria-hidden="true" /></button>
          </DropdownItem>)}
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
