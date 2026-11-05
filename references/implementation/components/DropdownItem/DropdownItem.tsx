import { createElement, type ComponentPropsWithoutRef } from 'react';
import styles from './DropdownItem.module.css';

type DropdownItemProps =
  | ({ as:'label' } & ComponentPropsWithoutRef<'label'>)
  | ({ as:'div' } & ComponentPropsWithoutRef<'div'>)
  | ({ as?:'button' } & ComponentPropsWithoutRef<'button'>);

/** Shared item surface; each consumer retains its semantics, layout and selection. */
export function DropdownItem({as='button',className,...props}:DropdownItemProps) {
  return createElement(as,{
    ...(as === 'button' ? {type:'button'} : {}),
    ...props,
    className:[styles.item,className].filter(Boolean).join(' '),
    'data-dropdown-item':'',
  });
}
