import { useId, type CSSProperties } from 'react';
import { isReportRangeValid, mauThresholds, type ReportNumberRange, type ReportNumericAttribute } from '../../data/reportFilters';
import s from './ReportRangeField.module.css';

export interface ReportRangeFieldProps {
  attribute: ReportNumericAttribute;
  value?: ReportNumberRange;
  scaleMax: number;
  onChange: (value: ReportNumberRange) => void;
}

/** Shared range surface for the general panel and column menu. Scale is not a filter limit. */
export function ReportRangeField({ attribute, value = {}, scaleMax, onChange }: ReportRangeFieldProps) {
  const id = useId();
  const label = attribute === 'mau' ? 'MAU' : 'Последний просмотр';
  const valid = isReportRangeValid(value);
  const descriptionId = !valid ? `${id}-error` : attribute === 'mau' ? `${id}-description` : undefined;
  const maximum = Math.max(1, scaleMax, value.min ?? 0, value.max ?? 0);
  const lower = Math.min(maximum, Math.max(0, value.min ?? 0));
  const upper = Math.min(maximum, Math.max(lower, value.max ?? maximum));
  const left = lower / maximum * 100;
  const right = upper / maximum * 100;
  function input(bound: 'min' | 'max', number: number) {
    onChange({ ...value, [bound]: Number.isFinite(number) ? number : undefined });
  }
  return <div className={s.field} data-report-range={attribute} data-invalid={!valid}>
    <div className={s.label} id={`${id}-label`}>
      <span>{label}</span>
      {attribute === 'mau' && <span className={s.description} id={`${id}-description`}>Количество активных пользователей за месяц</span>}
    </div>
    <div className={s.input}>
      <label className={s.value}><span>От</span><input type="number" inputMode="numeric" min="0" step="1" aria-label={`${label}: от`} aria-invalid={!valid} aria-describedby={descriptionId}
        value={value.min ?? ''} placeholder="0" onChange={event => input('min', event.currentTarget.valueAsNumber)} /></label>
      <label className={`${s.value} ${s.upper}`}><span>До</span><input type="number" inputMode="numeric" min="0" step="1" aria-label={`${label}: до`} aria-invalid={!valid} aria-describedby={descriptionId}
        value={value.max ?? ''} placeholder="Любое" onChange={event => input('max', event.currentTarget.valueAsNumber)} /></label>
      <div className={s.slider}>
        <div className={s.track} /><div className={s.progress} style={{ left:`calc(${left}% + ${10 - left / 5}px)`, right:`calc(${100 - right}% + ${10 - (100 - right) / 5}px)` }} />
        {[left, right].map((position, index) => <span key={index} className={s.knob} style={{ left:`calc(${position}% - ${position / 5}px)` }} aria-hidden="true"><img src="/images/report-range/thumb.svg" width="68" height="68" alt="" /></span>)}
        <input className={s.range} type="range" min="0" max={maximum} step="1" value={lower} aria-label={`${label}: нижняя граница`} style={{ zIndex:lower === maximum ? 4 : 2 } as CSSProperties}
          onChange={event => { const min = Math.min(event.currentTarget.valueAsNumber, upper); onChange({ ...value, min:min === 0 ? undefined : min }); }} />
        <input className={s.range} type="range" min="0" max={maximum} step="1" value={upper} aria-label={`${label}: верхняя граница`}
          onChange={event => { const max = Math.max(event.currentTarget.valueAsNumber, lower); onChange({ ...value, max:max === maximum ? undefined : max }); }} />
      </div>
    </div>
    {!valid && <p id={`${id}-error`} className={s.error} role="alert">Введите целые числа от 0; «От» не должно превышать «До».</p>}
    {attribute === 'mau' && <div className={s.chips} role="group" aria-label="Пороги MAU">
      {mauThresholds.map(threshold => <button type="button" key={threshold} aria-pressed={value.min === threshold && value.max === undefined}
        onClick={() => onChange({ min:threshold })}>От {threshold}</button>)}
    </div>}
  </div>;
}
