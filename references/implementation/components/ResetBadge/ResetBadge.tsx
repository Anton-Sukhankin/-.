import { X } from 'lucide-react';
import styles from './ResetBadge.module.css';

export function ResetBadge({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return <span className={`${styles.badge} ${className}`} data-compact={compact} aria-hidden="true">
    <X size={compact ? 10 : 14} strokeWidth={2} />
  </span>;
}
