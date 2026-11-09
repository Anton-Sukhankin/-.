import { AttributeValue } from '../AttributeValue/AttributeValue';
import { OverflowText } from '../OverflowText/OverflowText';
import { DropdownItem } from '../DropdownItem/DropdownItem';
import { SelectionCheck } from '../DropdownItem/SelectionCheck';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import styles from './FilterValueList.module.css';
import { shouldShowFilterSearch } from './searchVisibility';
export interface FilterValueOption { value: string; label: string }
export interface FilterValueListProps {
  label: string;
  options: readonly FilterValueOption[];
  totalOptionsCount: number;
  selectedValues: readonly string[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleValue: (value: string) => void;
  width?: 320 | 440 | 212 | 292 | '100%';
  showSearch?: boolean;
  selectionMode?: 'multiple' | 'single';
  /** ColumnFilterMenu supplies its own outer surface. */
  embedded?: boolean;
}
/** The caller supplies filtered options; selection and search remain controlled. */
export function FilterValueList({label,options,totalOptionsCount,selectedValues,searchValue,onSearchChange,onToggleValue,width=320,showSearch=true,selectionMode='multiple',embedded=false}:FilterValueListProps) {
  const radioGroup = useId();
  const isSelected=(value:string)=>selectionMode === 'single' ? selectedValues[0] === value : selectedValues.includes(value);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerY: number; scrollTop: number } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const contentHeight = Math.max(0, options.length * 40 - 4);
  const overflows = contentHeight > 276;
  const thumbHeight = overflows ? Math.round(276 * 276 / contentHeight) : 276;
  const scrollRange = Math.max(0, contentHeight - 276);
  const thumbRange = 276 - thumbHeight;
  const thumbTop = scrollRange ? Math.min(scrollTop, scrollRange) / scrollRange * thumbRange : 0;
  useLayoutEffect(() => { setScrollTop(viewport.current?.scrollTop ?? 0); }, [options.length]);
  return <div key={label} className={embedded ? styles.embedded : styles.surface} style={embedded ? undefined : { width }}
    role="group" aria-label={label} data-dropdown-surface={!embedded}>
      {shouldShowFilterSearch(totalOptionsCount, selectionMode, showSearch) && <div className={styles.searchArea} data-filter-search>
        <div className={styles.searchField}>
          <img src="/images/column-filter/search.svg" alt="" aria-hidden="true" />
          <input type="search" aria-label="Поиск значений" placeholder="Поиск значений" autoComplete="off"
            value={searchValue} onChange={event => onSearchChange(event.target.value)} />
        </div>
      </div>}
      <div className={styles.listArea} data-filter-list>
        <div ref={viewport} className={styles.viewport} data-filter-viewport role={selectionMode === 'single' ? 'radiogroup' : 'group'} aria-label={selectionMode === 'single' ? label : 'Значения фильтра'}
          onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
          <div className={styles.options}>
            {options.map(option => (
              <DropdownItem as="label" className={`${styles.option} ${selectionMode === 'single' ? styles.singleOption : ''}`} key={option.value} data-selected={isSelected(option.value)}>
                {selectionMode === 'single'
                  ? <><input className={styles.singleInput} type="radio" name={radioGroup} value={option.value} checked={isSelected(option.value)} onChange={() => onToggleValue(option.value)} /><SelectionCheck selected={isSelected(option.value)}/></>
                  : <span className={styles.checkbox}>
                  <input type="checkbox" value={option.value} checked={selectedValues.includes(option.value)} onChange={() => onToggleValue(option.value)} />
                  <span className={styles.checkboxVisual} aria-hidden="true">
                    {selectedValues.includes(option.value)
                      ? <img src="/images/column-filter/checkbox-checked.svg" alt="" />
                      : <span className={styles.unchecked} />}
                  </span>
                </span>}
                <OverflowText className={styles.optionText} fullText={option.label}><AttributeValue value={option.label} /></OverflowText>
              </DropdownItem>
            ))}
          </div>
        </div>
        {overflows && <div className={styles.track} aria-hidden="true" data-filter-scrollbar
          onPointerDown={event => {
            if (!viewport.current) return;
            if (event.target === event.currentTarget) {
              viewport.current.scrollTop = (event.clientY - event.currentTarget.getBoundingClientRect().top - thumbHeight / 2) / thumbRange * scrollRange;
            }
            drag.current = { pointerY: event.clientY, scrollTop: viewport.current.scrollTop };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            if (drag.current && viewport.current) viewport.current.scrollTop = drag.current.scrollTop + (event.clientY - drag.current.pointerY) / thumbRange * scrollRange;
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}>
          <div className={styles.thumb} style={{ height: thumbHeight, top: thumbTop }} />
        </div>}
      </div>

  </div>;
}
