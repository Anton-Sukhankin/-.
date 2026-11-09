import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import type { DiagnosticsGateway } from '../data/demoGateway';
import { DiagnosticsTable } from './DiagnosticsTable';
import styles from './App.module.css';
import { NavigationPreview } from './NavigationPreview';

function Diagnostics({ gateway }: { gateway: DiagnosticsGateway }) {
  const result = useQuery({
    queryKey: ['preparation', 'diagnostics'],
    queryFn: ({ signal }) => gateway.read(signal),
    retry: false,
  });
  return (
    <>
      <h1>Проверка подключения</h1>
      <p>Асинхронный источник и таблица работают на технических демонстрационных данных.</p>
      {result.isPending && <p role="status">Загрузка примера…</p>}
      {result.isError && <p role="alert">{result.error.message}</p>}
      {result.isSuccess && (
        <>
          <p role="status">Пример загружен: {result.data.length} строки.</p>
          <DiagnosticsTable data={result.data} />
        </>
      )}
    </>
  );
}

export function App({ gateway }: { gateway: DiagnosticsGateway }) {
  const location = useLocation();
  if (location.pathname === '/preview/navigation') {
    const params = new URLSearchParams(location.search);
    return <NavigationPreview tablePageSize={params.get('tableCase') === 'legacy-two-pages' ? 8 : undefined}
      favoritePageSize={params.get('favoriteCase') === 'two-pages' ? 8 : undefined}
      homePageSize={params.get('homeCase') === 'paginated' ? 3 : undefined} emptyHome={params.get('homeCase')?.startsWith('empty-') ? params.get('homeCase')!.slice(6) : undefined} />;
  }
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span>Каталог данных</span>
        <span className={styles.note}>Подготовка прототипа</span>
      </header>
      <nav className={styles.nav} aria-label="Техническая навигация">
        <NavLink to="/" end>Основа</NavLink>
        <NavLink to="/diagnostics">Проверка подключения</NavLink>
      </nav>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={
            <>
              <span className={styles.label}>Техническая основа</span>
              <h1>Среда прототипа подготовлена</h1>
              <p>Это служебный вход в проверяемые блоки. Полные страницы продукта собираются по итерационному плану.</p>
              <p>Подключены маршрутизация, работа с данными, таблицы и инструменты проверки. Используется CoFo Sans.</p>
              <Link className={styles.action} to="/diagnostics">Проверить источник данных</Link>
              <ul>
                <li><a href="/previews/icons.html">Открыть библиотеку иконок Lucide</a></li>
                <li><Link to="/preview/navigation">Открыть каркас, карточки и таблицу отчётов</Link></li>
                <li><a href="/previews/subscriptions.html">Открыть карточки подписок · I10</a></li>
                <li><a href="/previews/contributors.html">Открыть карточку участника · I12</a></li>
                <li><a href="/previews/news.html">Открыть список новостей · I14</a></li>
                <li><a href="/previews/column-filters.html">Проверить меню фильтров · I07</a></li>
                <li><a href="/previews/home-controls.html">Проверить переключатели Главной · I09a</a></li>
                <li><a href="/previews/filter-panel.html">Проверить общую панель фильтров · I08</a></li>
              </ul>
            </>
          } />
          <Route path="/diagnostics" element={<Diagnostics gateway={gateway} />} />
          <Route path="*" element={<><h1>Страница не найдена</h1><Link to="/">Вернуться к основе</Link></>} />
        </Routes>
      </main>
    </div>
  );
}
