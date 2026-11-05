import { useState } from 'react';
import styles from './Sidebar.module.css';

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  count?: string;
}

interface SidebarProps {
  items: readonly SidebarItem[];
  activeId: string;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ items, activeId, collapsed, onSelect, onCollapsedChange }: SidebarProps) {
  const [boundaryHovered, setBoundaryHovered] = useState(false);
  const [boundaryFocused, setBoundaryFocused] = useState(false);
  const boundaryVisible = boundaryHovered || boundaryFocused;

  return (
    <aside className={styles.sidebar} data-collapsed={collapsed} data-boundary={boundaryVisible}>
      <nav aria-label="Разделы каталога" className={styles.menu}>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.row}>
              <button
                type="button"
                className={styles.item}
                aria-label={item.label}
                aria-current={item.id === activeId ? 'page' : undefined}
                onClick={() => onSelect(item.id)}
              >
                <img className={styles.icon} src={item.icon} alt="" aria-hidden="true" />
                <span className={styles.text} aria-hidden={collapsed}>
                  <span className={styles.label}>{item.label}</span>
                  {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.boundary}
        onMouseEnter={() => setBoundaryHovered(true)}
        onMouseLeave={() => setBoundaryHovered(false)}>
        <button
          type="button"
          className={styles.toggle}
          aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
          aria-expanded={!collapsed}
          onFocus={() => setBoundaryFocused(true)}
          onBlur={() => setBoundaryFocused(false)}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <img src={`/icons/sidebar/${collapsed ? 'expand' : 'collapse'}.svg`} width="12" height="12" alt="" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
