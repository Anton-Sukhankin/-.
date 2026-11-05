import { useId,useState } from 'react';
import { Select } from 'radix-ui';
import { DropdownItem } from '../DropdownItem/DropdownItem';
import { SelectionCheck } from '../DropdownItem/SelectionCheck';
import styles from './SingleSelect.module.css';

export interface SingleSelectOption {value:string;label:string;disabled?:boolean}
interface SingleSelectProps {
  label:string;
  value:string;
  options:readonly SingleSelectOption[];
  onValueChange:(value:string)=>void;
  className?:string;
  disabled?:boolean;
  open?:boolean;
  onOpenChange?:(open:boolean)=>void;
}

/** Accessible controlled select. An empty application value is a real "All" option. */
export function SingleSelect({label,value,options,onValueChange,className,disabled,open,onOpenChange}:SingleSelectProps) {
  const emptyValue=useId();
  const [keyboard,setKeyboard]=useState(false);
  const encode=(value:string)=>value === '' ? emptyValue : value;
  return <Select.Root value={encode(value)} onValueChange={value=>onValueChange(value === emptyValue ? '' : value)} disabled={disabled} open={open} onOpenChange={onOpenChange}>
    <Select.Trigger className={[styles.trigger,className].filter(Boolean).join(' ')} aria-label={label} data-single-select onKeyDown={()=>setKeyboard(true)} onPointerDown={()=>setKeyboard(false)}>
      <Select.Value />
      <Select.Icon className={styles.chevron}><img src="/images/metrics/catalog/chevron-down.svg" width="16" height="16" alt="" /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className={styles.content} position="popper" sideOffset={8} collisionPadding={8} aria-label={label} data-single-select-popup data-keyboard={keyboard} onKeyDown={()=>setKeyboard(true)} onPointerMove={()=>setKeyboard(false)}>
        <Select.Viewport className={styles.viewport}>
          {options.map(option=><Select.Item key={option.value} value={encode(option.value)} disabled={option.disabled} asChild>
            <DropdownItem className={styles.option}>
              <SelectionCheck selected={option.value === value}/>
              <Select.ItemText>{option.label}</Select.ItemText>
            </DropdownItem>
          </Select.Item>)}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>;
}
