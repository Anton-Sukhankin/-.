import table from '../../../components/ReportTable/ReportTable.module.css';
import { EmptyDetail } from '../EmptyDetail';
import { formatUsageChange, formatUsageDecimal, formatUsageNumber } from './model';
import type { UsageMonth } from './model';
import s from './Usage.module.css';

const headings = ['Месяц', 'MAU', 'События', 'Активных дней', 'Средний DAU', 'Пиковый DAU', 'Регулярность', 'Δ MAU', 'Δ событий', 'Сегмент аудитории'];
const trend = (change: number | null) => change === null || change === 0 ? 'unknown' : change > 0 ? 'up' : 'down';

function measureHorizontalScrollbar(scroll: HTMLDivElement | null) {
  if (!scroll) return;

  const updateInset = () => {
    const scrollbarHeight = scroll.offsetHeight - scroll.clientHeight;
    scroll.style.setProperty('--history-scrollbar-height', `${scrollbarHeight}px`);
  };
  updateInset();
  const observer = new ResizeObserver(updateInset);
  observer.observe(scroll);
  return () => observer.disconnect();
}

export function UsageHistoryTable({ months }: { months: readonly UsageMonth[] }) {
  if (!months.length) return <EmptyDetail title="История пока отсутствует" description="Помесячные показатели использования не предоставлены." />;
  return <div className={s.historyFrame}>
    <div ref={measureHorizontalScrollbar} className={s.historyScroll} data-list-scroll="local" tabIndex={0} role="region" aria-label="Прокрутка истории по месяцам">
      <div className={`${table.surface} ${s.historySurface}`} role="table" aria-label="История по месяцам" aria-rowcount={months.length + 1} aria-colcount={10}>
        <div className={table.header} role="rowgroup"><div className={`${table.headerRow} ${s.historyGrid}`} role="row">{headings.map(heading => <div className={s.columnHeading} role="columnheader" key={heading}>{heading}</div>)}</div></div>
        <div className={`${table.bodyFrame} ${s.historyBody}`} role="rowgroup"><div className={`${table.group} ${s.historyRows}`}>{months.map(month => {
          const cells = [month.label, formatUsageNumber(month.mau), formatUsageNumber(month.events), formatUsageNumber(month.activeDays), formatUsageDecimal(month.averageDau), formatUsageNumber(month.peakDau), `${month.regularity}%`, formatUsageChange(month.mauChange), formatUsageChange(month.eventChange), month.audience];
          const trends: Record<number, string> = { 7: trend(month.mauChange), 8: trend(month.eventChange) };
          return <div className={`${table.row} ${s.historyGrid} ${s.historyRow}`} role="row" key={month.id}>{cells.map((value, index) => <div role="cell" className={`${table.cell} ${s.historyCell}`} data-trend={trends[index]} key={headings[index]}>{value}</div>)}</div>;
        })}</div></div>
      </div>
    </div>
  </div>;
}
