import styles from './SubscriptionCard.module.css';

export interface SubscriptionCardData {
  id: string;
  title: string;
  typeLabel: string;
  statusLabel: string;
  report: { id: string; title: string };
  nextDeliveryText: string;
  channelLabel: string;
  botActionLabel: string;
}

export interface SubscriptionCallbacks {
  onUnsubscribe: (subscriptionId: string) => void;
  onOpenReport: (reportId: string) => void;
  onOpenBot: (subscriptionId: string) => void;
}

export interface SubscriptionCardProps extends SubscriptionCallbacks {
  subscription: SubscriptionCardData;
  variant?: 'standalone' | 'joined';
}

export function SubscriptionCard({
  subscription,
  variant = 'standalone',
  onUnsubscribe,
  onOpenReport,
  onOpenBot,
}: SubscriptionCardProps) {
  return (
    <article className={`${styles.card} ${variant === 'joined' ? styles.joined : styles.standalone}`}
      data-subscription-id={subscription.id} aria-label={subscription.title}>
      <header className={styles.header}>
        <span className={styles.document}>
          <img src="/icons/reports/report-document.svg" width="16" height="16" alt="" aria-hidden="true" />
        </span>
        <div className={styles.information}>
          <div className={styles.typeAndStatus}>
            <span className={styles.label}>{subscription.typeLabel}</span>
            <span className={styles.status}>{subscription.statusLabel}</span>
          </div>
          <span className={styles.title}>{subscription.title}</span>
        </div>
        <button type="button" className={styles.unsubscribe}
          aria-label={`Отписаться от «${subscription.title}»`}
          onClick={() => onUnsubscribe(subscription.id)}>Отписаться</button>
      </header>
      <dl className={styles.details}>
        <div className={`${styles.field} ${styles.report}`}>
          <dt className={styles.label}>Отчёт</dt>
          <dd className={styles.value}>
            <button type="button" className={styles.link}
              onClick={() => onOpenReport(subscription.report.id)}>{subscription.report.title}</button>
          </dd>
        </div>
        <div className={`${styles.field} ${styles.nextDelivery}`}>
          <dt className={styles.label}>Следующая отправка</dt>
          <dd className={`${styles.value} ${styles.deliveryValue}`}>{subscription.nextDeliveryText}</dd>
        </div>
        <div className={`${styles.field} ${styles.channel}`}>
          <dt className={styles.label}>{subscription.channelLabel}</dt>
          <dd className={styles.value}>
            <button type="button" className={styles.link}
              aria-label={`${subscription.botActionLabel}: «${subscription.title}»`}
              onClick={() => onOpenBot(subscription.id)}>{subscription.botActionLabel}</button>
          </dd>
        </div>
      </dl>
    </article>
  );
}

export interface SubscriptionGroupProps extends SubscriptionCallbacks {
  subscriptions: readonly SubscriptionCardData[];
  ariaLabel?: string;
}

export function SubscriptionGroup({ subscriptions, ariaLabel = 'Подписки', ...callbacks }: SubscriptionGroupProps) {
  return (
    <section className={styles.group} aria-label={ariaLabel}>
      {subscriptions.map(subscription => (
        <SubscriptionCard key={subscription.id} subscription={subscription} variant="joined" {...callbacks} />
      ))}
    </section>
  );
}
