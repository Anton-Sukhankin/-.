import { useEffect, useId, useRef, useState } from 'react';
import { Select } from 'radix-ui';
import { DropdownItem } from '../DropdownItem/DropdownItem';
import { SelectionCheck } from '../DropdownItem/SelectionCheck';
import { SelectClearButton } from '../SelectClearButton/SelectClearButton';
import clearStyles from '../SelectClearButton/SelectClearButton.module.css';
import styles from './SingleSelect.module.css';

export interface SingleSelectOption {value:string;label:string;disabled?:boolean}
const selectOpening = 'catalog-single-select-opening';
interface SingleSelectProps {
  label:string;
  value:string;
  options:readonly SingleSelectOption[];
  onValueChange:(value:string)=>void;
  className?:string;
  controlClassName?:string;
  resetValue?:string;
  disabled?:boolean;
  open?:boolean;
  onOpenChange?:(open:boolean)=>void;
}

/** Accessible controlled select. An empty application value is a real "All" option. */
export function SingleSelect({label,value,options,onValueChange,className,controlClassName,resetValue,disabled,open,onOpenChange}:SingleSelectProps) {
  const emptyValue=useId();
  const [keyboard,setKeyboard]=useState(false);
  const [localOpen,setLocalOpen]=useState(false);
  const isOpen = open ?? localOpen;
  const switching = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const owner = trigger.current?.ownerDocument;
    if (!isOpen || !owner) return;
    function closeForOtherSelect() {
      switching.current = true;
      if (open === undefined) setLocalOpen(false);
      onOpenChange?.(false);
    }
    owner.addEventListener(selectOpening, closeForOtherSelect);
    return () => owner.removeEventListener(selectOpening, closeForOtherSelect);
  }, [isOpen, open, onOpenChange]);

  function changeOpen(next: boolean) {
    if (next && !isOpen) trigger.current?.ownerDocument.dispatchEvent(new Event(selectOpening));
    if (open === undefined) setLocalOpen(next);
    onOpenChange?.(next);
  }

  const encode=(value:string)=>value === '' ? emptyValue : value;
  const canClear = resetValue !== undefined && value !== resetValue && !disabled;
  const selectTrigger = (
    <Select.Trigger ref={trigger} className={[styles.trigger,className].filter(Boolean).join(' ')} aria-label={label} data-single-select onKeyDown={()=>setKeyboard(true)} onPointerDown={()=>setKeyboard(false)}>
      <Select.Value />
      <Select.Icon className={styles.chevron}><img src="/images/metrics/catalog/chevron-down.svg" width="16" height="16" alt="" /></Select.Icon>
    </Select.Trigger>
  );
  return <Select.Root value={encode(value)} onValueChange={value=>onValueChange(value === emptyValue ? '' : value)} disabled={disabled} open={isOpen} onOpenChange={changeOpen}>
    {resetValue === undefined ? selectTrigger : <div className={[clearStyles.control, styles.filterControl, controlClassName].filter(Boolean).join(' ')} data-can-clear={canClear}>
      {selectTrigger}
      {canClear && !isOpen && <SelectClearButton label={label} trigger={trigger} onClear={() => onValueChange(resetValue)} />}
    </div>}
    <Select.Portal>
      <Select.Content className={styles.content} position="popper" sideOffset={8} collisionPadding={8} aria-label={label} data-single-select-popup data-keyboard={keyboard} onKeyDown={()=>setKeyboard(true)} onPointerMove={()=>setKeyboard(false)}
        onCloseAutoFocus={event => {
          if (switching.current) event.preventDefault();
          switching.current = false;
        }}>
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
