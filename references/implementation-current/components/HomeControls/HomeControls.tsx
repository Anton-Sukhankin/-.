import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './HomeControls.module.css';
import { FilterButton } from '../FilterButton/FilterButton';
import { transitionCatalog } from '../catalogTransition';

export interface HomeControlOption {
  id: string;
  label: string;
  count?: string | number;
  tabId?: string;
  panelId?: string;
  /** Source-specific enabled surface for text segments; selected always uses white. */
  unselectedSurface?: 'track' | 'neutral';
}

export interface HomeSelection {
  ariaLabel: string;
  items: readonly HomeControlOption[];
  selectedId: string;
  onChange: (id: string) => void;
}

export type HomeViewMode = 'list' | 'cards';
export const DEFAULT_VIEW_MODE: HomeViewMode = 'list';

export interface HomeViewSelection {
  value: HomeViewMode;
  onChange: (value: HomeViewMode) => void;
  ariaLabel?: string;
  inactiveSurface?: 'track' | 'neutral';
}

export interface HomeControlsProps {
  tabs: HomeSelection;
  segments?: HomeSelection;
  contribution?: HomeSelection;
  view?: HomeViewSelection;
  onFilter?: (anchor?: HTMLButtonElement) => void;
  filterLabel?: string;
  filterCount?: number;
  onClearFilters?: () => void;
}

export function ControlCount({ count, selected, expand }: { count: string | number; selected: boolean; expand?: boolean }) {
  return <span className={styles.counter} data-control-count data-selected={selected} data-expand={expand}>
    <span className={styles.counterText}>{count}</span>
  </span>;
}

function Choices({ selection, kind, appearance }: { selection: HomeSelection; kind: 'tabs' | 'segments' | 'contribution'; appearance?: 'registry' }) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % selection.items.length; break;
      case 'ArrowLeft': next = (index - 1 + selection.items.length) % selection.items.length; break;
      case 'Home': next = 0; break;
      case 'End': next = selection.items.length - 1; break;
      default: return;
    }
    event.preventDefault();
    buttons.current[next]?.focus();
    selection.onChange(selection.items[next].id);
  }
  return (
    <div role="tablist" aria-label={selection.ariaLabel} className={kind === 'tabs' ? styles.tabs : styles.segments} data-control-group={kind} data-appearance={appearance}>
      {selection.items.map((item, index) => (
        <button type="button" role="tab" key={item.id} data-control-id={item.id}
          className={kind === 'tabs' ? styles.tab : styles.segment}
          id={item.tabId} aria-controls={item.panelId}
          data-unselected-surface={item.unselectedSurface}
          aria-selected={selection.selectedId === item.id} tabIndex={selection.selectedId === item.id ? 0 : -1}
          ref={node => { buttons.current[index] = node; }}
          onKeyDown={event => navigate(event, index)} onClick={() => selection.onChange(item.id)}>
          <span className={styles.optionContent}>
            <span className={styles.label}>{item.label}</span>
            {item.count !== undefined && <ControlCount count={item.count} selected={selection.selectedId === item.id} />}
          </span>
          {kind === 'tabs' && <span className={styles.underline} aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

/** Reuses the product's segment group, including keyboard navigation and visual states. */
export function SegmentedControl({ selection }: { selection: HomeSelection }) {
  return <Choices selection={selection} kind="segments" />;
}

/** Public tab-only composition; the default geometry used by HomeControls stays unchanged. */
export function TabControl({ selection, appearance }: { selection: HomeSelection; appearance?: 'registry' }) {
  return <Choices selection={selection} kind="tabs" appearance={appearance} />;
}

const textViewLabels = { cards: 'Карточки', list: 'Список' } as const;

export function ViewPicker({ selection, appearance = 'icons' }: { selection: HomeViewSelection; appearance?: 'icons' | 'text' }) {
  const text = appearance === 'text';
  const views: readonly HomeViewMode[] = text ? ['cards', 'list'] : ['list', 'cards'];
  return (
    <div className={styles.view} role="group" aria-label={selection.ariaLabel ?? 'Вид представления'} data-control-group="view" data-view-appearance={appearance}>
      {views.map(value => (
        <button type="button" key={value} className={styles.viewButton} data-control-id={value}
          data-inactive-surface={selection.inactiveSurface}
          aria-label={text ? undefined : value === 'list' ? 'Табличный вид' : 'Карточный вид'} aria-pressed={selection.value === value}
          onClick={() => transitionCatalog(() => selection.onChange(value), 'view', selection.value !== value)}>
          {text ? textViewLabels[value] : <img src={`/images/home-controls/${value}-${selection.value === value ? 'active' : 'inactive'}.svg`} width="16" height="16" alt="" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

/** Presentation only. The caller owns selected IDs, counts, visible groups and action results. */
export function HomeControls({ tabs, segments, contribution, view, onFilter, filterLabel = 'Открыть фильтры отчётов', filterCount = 0, onClearFilters }: HomeControlsProps) {
  const hasToolbar = Boolean(segments || contribution || view || onFilter);
  return (
    <div className={styles.controls} data-home-controls>
      <Choices selection={tabs} kind="tabs" />
      {hasToolbar && (
        <div className={styles.toolbar} data-control-toolbar>
          <div className={styles.left}>{segments && <Choices selection={segments} kind="segments" />}</div>
          <div className={styles.right}>
            {contribution && <Choices selection={contribution} kind="contribution" />}
            {(view || onFilter) && <div className={styles.viewAndFilter}>
              {view && <ViewPicker selection={view} />}
              {onFilter && <FilterButton label={filterLabel} count={filterCount} onOpen={event => onFilter(event.currentTarget)} onClear={onClearFilters} />}
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}
