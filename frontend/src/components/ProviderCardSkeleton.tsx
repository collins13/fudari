type Props = {
  variant?: 'grid' | 'list' | 'compact';
};

/** Mirrors ProviderCard's structure so the real card swaps in without reflow. */
export default function ProviderCardSkeleton({ variant = 'grid' }: Props) {
  return (
    <div
      className={`card tx-provider-card tx-provider-card--${variant} tx-provider-card--photo tx-skeleton h-100`}
      aria-hidden="true"
    >
      <div className="tx-provider-card__media tx-skeleton__block"></div>

      <div className="card-body tx-provider-card__body">
        <div className="tx-provider-card__identity">
          <span className="tx-skeleton__line" style={{ width: '62%', height: 16 }}></span>
          <span className="tx-skeleton__line" style={{ width: '45%' }}></span>
          <span className="tx-skeleton__line" style={{ width: '54%' }}></span>
        </div>

        <div className="tx-provider-card__badges">
          <span className="tx-skeleton__pill" style={{ width: 86 }}></span>
        </div>

        <div className="tx-provider-card__facts">
          <span className="tx-skeleton__line" style={{ width: '70%' }}></span>
        </div>

        <div className="tx-provider-card__footer">
          <div className="tx-provider-card__terms">
            <span className="tx-skeleton__line" style={{ width: 104, height: 14 }}></span>
            <span className="tx-skeleton__line" style={{ width: 80 }}></span>
          </div>
          <div className="tx-provider-card__actions">
            <span className="tx-skeleton__button"></span>
            <span className="tx-skeleton__button"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
