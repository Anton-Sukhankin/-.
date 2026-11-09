# Зафиксированный срез прототипа

Срез `prototype-2026-11-04-c1` — локальная основа сверки включённых интерфейсов. [Манифест](<manifest.json>) ведёт версию/хеш дерева исходников, условия рендера, точное состояние, размер окна и SHA256 каждой картинки. Компоненты владеют параметрами, механиками и исключениями; этот ресурс не создаёт второй набор продуктовых правил.

Читать контракт раздела, выбранный базовый вариант и YAML, затем совпадающий PNG. Этот срез воспроизводится по локальным материалам. Исторические ссылки и изображения сохраняют происхождение; поздние подтверждённые решения имеют описанный у владельца приоритет.

Манифест снимков фиксирует исходный срез. Адресные ссылки на код в действующих контрактах относятся к переданным файлам проекта. Последующие изменения рабочего прототипа не входят в срез автоматически. В передаче точные bytes выбранных источников и их original→portable соответствие подтверждает PACKAGE.json; всё приложение не передаётся. Первичные данные — локальные демонаборы, не API или гарантия серверного хранения.

Снимок показывает наблюдаемую композицию. Известные отклонения не копируются как норма: у отчёта с отсутствующим содержимым код показывает0 вместо неизвестного count; в Usage пропущено принятое пояснение; при возврате к Источникам наблюдался сброс scrollLeft120→0. Точные требования и границы остаются у соответствующих владельцев. Поверхность обозначения demo-статей, интерпретация старого gap и неописанные внешние результаты не достраиваются по рисунку.

Основные кадры1440×900; дополнительно1024×768. При capture загружены оба переданных начертания CoFo Sans. Reduced motion отключает переходы только для стабильного снимка; исходные времена/кривые и обычный режим определяет контракт компонента.

| Состояние | Воспроизводимый вход / действие у владельца | Ресурс |
|---|---|---|
| home | `/preview/navigation` | [PNG](<frames/home.png>) |
| news | `/preview/navigation?tab=news` | [PNG](<frames/news.png>) |
| news-reading | `/preview/navigation?tab=news&news=demo-news-2` | [PNG](<frames/news-reading.png>) |
| reports | `/preview/navigation?section=reports` | [PNG](<frames/reports.png>) |
| reports-single | `/preview/navigation?section=reports&tableCase=single-page` | [PNG](<frames/reports-single.png>) |
| report-overview | `/preview/navigation?section=reports&report=demo-report-summary&reportTab=overview` | [PNG](<frames/report-overview.png>) |
| report-sources | `/preview/navigation?section=reports&report=demo-report-summary&reportTab=sources` | [PNG](<frames/report-sources.png>) |
| report-usage | `/preview/navigation?section=reports&report=demo-report-summary&reportTab=usage` | [PNG](<frames/report-usage.png>) |
| report-metrics | `/preview/navigation?section=reports&report=demo-report-summary&reportTab=metrics` | [PNG](<frames/report-metrics.png>) |
| report-slides | `/preview/navigation?section=reports&report=demo-report-summary&reportTab=slides` | [PNG](<frames/report-slides.png>) |
| report-mailings | `/preview/navigation?section=reports&report=demo-report-summary&reportTab=mailings` | [PNG](<frames/report-mailings.png>) |
| report-technical | `/preview/navigation?section=reports&report=demo-report-summary&reportTab=technical` | [PNG](<frames/report-technical.png>) |
| metrics | `/preview/navigation?section=metrics` | [PNG](<frames/metrics.png>) |
| sources | `/preview/navigation?section=sources` | [PNG](<frames/sources.png>) |
| source-detail | `/preview/navigation?section=sources&source=source-reportcrm-date` | [PNG](<frames/source-detail.png>) |
| reports-filter-open | `/preview/navigation?section=reports` | [PNG](<frames/reports-filter-open.png>) |
| report-accordion-closed | `/preview/navigation?section=reports&report=demo-report-summary&reportTab=overview` | [PNG](<frames/report-accordion-closed.png>) |
| reports-1024 | `/preview/navigation?section=reports` | [PNG](<frames/reports-1024.png>) |
| report-1024 | `/preview/navigation?section=reports&report=demo-report-summary` | [PNG](<frames/report-1024.png>) |
| subscriptions | `/preview/navigation?segment=subscriptions` | [PNG](<frames/subscriptions.png>) |
| contribution | `/preview/navigation?segment=contribution` | [PNG](<frames/contribution.png>) |
| reports-cards | `/preview/navigation?section=reports` | [PNG](<frames/reports-cards.png>) |

## Данные для воспроизведения

Сгенерированы из чистых TS/JSON-источников той же версии; реализация экранов не требуется для их чтения. Поля не определяют production API.

- [Отчёты и избранное](<data/reports.json>): catalog_rows, favorite_rows, summaries.
- [Детальный отчёт](<data/report-detail.json>): подтверждённый summary-пример, содержимое вкладок и связанные наборы; не обобщает неизвестные метаданные других объектов.
- [Метрики](<data/metrics.json>): каталог и адресные профили. Контакты исторического профиля 4 опущены. Для воспроизведения паспорта используйте кадры [действующего контракта](<../../Разделы/Метрики и показатели/Детальная карточка/Контракт.md>).
- [Источники](<data/sources.json>): строки, профили и ID rewedo.
- [Главная](<data/home.json>): подписки, вклад и новости с demo-происхождением.

Дополнительные кадры состояний перечислены в манифесте с точными действиями подготовки; список выше сохраняет основные входы.

## Графика текущей реализации

В manifest.json раздел implementation_assets ведёт точные файлы, исходные публичные ID, SHA256 и адресных потребителей. Это ограниченный набор ресурсов уже включённых источников, не экспорт всего public. В автономной передаче source становится относительной ссылкой на файл; id сохраняет исходное имя. Доступны и SVG действий шапки, которые раньше оставались только строками в кодовом источнике. Изображение состояния не используется вместо векторного ресурса.

## Адресное дополнение визуальных состояний

Дополнительные кадры меню отчётной таблицы, статуса панели, матрицы источника, native Fullscreen, технических empty/paginated-входов Главной, уведомления подписки и нижнего действия новости сняты с того же неизменённого среза. Точные входы/действия и hashes находятся в manifest.json. Технические pageSize/empty-входы показывают условия проверки, а не новую production-настройку.

На кадре `report-usage.png` подписи классификации стоят над значениями, пояснение отсутствует. Ожидаемое состояние и проверку ведёт [«Использование»](<../../Разделы/Отчёты/Паспорт/Использование.md#текущий-срез-и-отклонения>).

Кадр `source-detail.png` показывает общую композицию паспорта до уточнения списка полей. Для выравнивания тегов, счётчиков и раскрытия строки используйте [кадры полей от 5 ноября](<../../Разделы/Источники/Детальная карточка/Описание полей.md#эталоны-и-проверка-строки-поля>).

## Векторные ресурсы графа

В `vectors/lineage/` сохранены10 SVG из того же неизменённого рендера: метафора шапки, отчёт, два вида источника и инструменты fit/move/hand/group/maximize/exit. [Манифест](<manifest.json>) → `inline_svg_exports` связывает каждый файл с ролью, входом, состоянием и SHA256. Пути и геометрия SVG сохранены; добавлен xmlns, удалён служебный CSS-class. `currentColor` получает цвет от потребителя, размер — от его применения. `exit.svg` — метафора уменьшения для полноэкранного выхода и «Свернуть».

Это отдельные ресурсы реализации текущего графа, не изображения всей сцены и не новые правила поведения. При изменении графических метафор у владельца вкладки переснять SVG и связанные состояния; исторические Figma-ссылки сохраняют свою роль.

Файлы: [шапка](<vectors/lineage/heading.svg>), [отчёт](<vectors/lineage/report.svg>), [DataHub](<vectors/lineage/datahub.svg>), [каталог](<vectors/lineage/catalog.svg>), [fit](<vectors/lineage/fit.svg>), [move](<vectors/lineage/move.svg>), [hand](<vectors/lineage/hand.svg>), [group](<vectors/lineage/group.svg>), [maximize](<vectors/lineage/maximize.svg>), [exit](<vectors/lineage/exit.svg>).
