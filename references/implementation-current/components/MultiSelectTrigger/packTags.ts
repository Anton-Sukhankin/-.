export interface PackedTags { visibleCount: number; lastWidth: number }

/** Keep the visible prefix; reserve the counter by shrinking its preceding tag. */
export function packTags(available: number, widths: readonly number[], counterWidths: readonly number[], minimumTagWidth = 32, gap = 4): PackedTags {
  if (!widths.length || available <= 0) return { visibleCount: 0, lastWidth: 0 };
  let used = 0;
  let visibleCount = 0;
  for (const width of widths) {
    const next = used + (visibleCount ? gap : 0) + width;
    if (next > available) break;
    used = next;
    visibleCount++;
  }
  if (visibleCount === widths.length) return { visibleCount, lastWidth: widths.at(-1)! };
  if (widths.length === 1) return { visibleCount: 1, lastWidth: available };
  visibleCount = Math.max(1, visibleCount);
  while (visibleCount > 1) {
    const prefix = widths.slice(0, visibleCount - 1).reduce((sum, width) => sum + width + gap, 0);
    const remaining = available - prefix - gap - counterWidths[widths.length - visibleCount];
    if (remaining >= minimumTagWidth) break;
    visibleCount--;
  }
  const prefix = widths.slice(0, visibleCount - 1).reduce((sum, width) => sum + width + gap, 0);
  const lastWidth = Math.max(0, available - prefix - gap - counterWidths[widths.length - visibleCount]);
  if (lastWidth < minimumTagWidth && widths[visibleCount - 1] > lastWidth) return { visibleCount: 0, lastWidth: 0 };
  return { visibleCount, lastWidth: Math.min(widths[visibleCount - 1], lastWidth) };
}
