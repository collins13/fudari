import Image from 'next/image';
import Link from 'next/link';
import { isGeneratedAvatar } from '@/lib/avatar';
import { absolute } from '@/lib/seoUrls';
import { whatsappBotLink } from '@/lib/whatsapp';

export type ProviderCardData = {
  name: string;
  href: string;
  image?: string;
  skill?: string;
  location?: string;
  price?: number;
  rating?: number;
  reviews?: number;
  jobs?: number;
  availableNow?: boolean;
  verified?: boolean;
  tier?: string;
  services?: string[];
};

type Props = {
  provider: ProviderCardData;
  variant?: 'grid' | 'list' | 'compact';
  featured?: boolean;
};

export default function ProviderCard({ provider, variant = 'grid', featured = false }: Props) {
  const initial = provider.name.trim().charAt(0).toUpperCase() || 'F';
  const hasPhoto = Boolean(provider.image) && !isGeneratedAvatar(provider.image);
  const whatsappHref = whatsappBotLink(
    `Hi Fudari, I need help with ${provider.name}${provider.skill ? ` (${provider.skill})` : ''}${provider.location ? ` in ${provider.location}` : ''}. Profile: ${absolute(provider.href)}`,
  );
  const services = provider.services?.slice(0, 3) ?? [];
  const hasTrackRecord = Boolean(provider.reviews) || Boolean(provider.jobs);

  return (
    <article
      className={`card tx-provider-card tx-provider-card--${variant}${hasPhoto ? ' tx-provider-card--photo' : ''} h-100`}
    >
      {hasPhoto && (
        <div className="tx-provider-card__media">
          <Image
            src={provider.image as string}
            alt={`${provider.name}, ${provider.skill || 'service professional'}`}
            fill
            sizes={
              variant === 'list'
                ? '(max-width: 767px) 100vw, 300px'
                : '(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 340px'
            }
            className="tx-photo-cover"
          />
          {featured && (
            <span className="tx-provider-card__featured">
              <i className="fa-solid fa-crown" aria-hidden="true"></i> Featured
            </span>
          )}
        </div>
      )}

      <div className="card-body tx-provider-card__body">
        <div className="tx-provider-card__header">
          {!hasPhoto && (
            <span className="tx-provider-card__avatar">
              {provider.image ? (
                <Image src={provider.image} alt="" fill sizes="64px" className="tx-photo-cover" unoptimized />
              ) : (
                <span aria-hidden="true">{initial}</span>
              )}
            </span>
          )}

          <div className="tx-provider-card__identity">
            <h3 className="tx-provider-card__name">
              <Link href={provider.href}>{provider.name}</Link>
            </h3>
            {provider.skill && <p className="tx-provider-card__skill">{provider.skill}</p>}
            {provider.location && (
              <p className="tx-provider-card__location">
                <i className="fa-solid fa-location-dot" aria-hidden="true"></i> {provider.location}
              </p>
            )}
          </div>
        </div>

        {((featured && !hasPhoto) || provider.verified) && (
          <div className="tx-provider-card__badges">
            {featured && !hasPhoto && (
              <span className="tx-provider-card__badge tx-provider-card__badge--featured">
                <i className="fa-solid fa-crown" aria-hidden="true"></i> Featured
              </span>
            )}
            {provider.verified && (
              <span className="tx-provider-card__badge tx-provider-card__badge--verified">
                <i className="fa-solid fa-shield-halved" aria-hidden="true"></i> ID verified
              </span>
            )}
          </div>
        )}

        {services.length > 0 && (
          <div className="tx-provider-card__services" aria-label="Services offered">
            {services.map((service) => <span key={service}>{service}</span>)}
          </div>
        )}

        <div className="tx-provider-card__facts" aria-label="Provider track record">
          {hasTrackRecord ? (
            <>
              {provider.reviews ? (
                <span className="tx-provider-card__rating">
                  <i className="fa-solid fa-star" aria-hidden="true"></i>
                  {provider.rating?.toFixed(1) || '0.0'}
                  <span className="tx-provider-card__reviews">({provider.reviews})</span>
                </span>
              ) : null}
              {provider.jobs ? <span>{provider.jobs} jobs done</span> : null}
            </>
          ) : (
            <span>New on Fudari</span>
          )}
        </div>

        <div className="tx-provider-card__footer">
          <div className="tx-provider-card__terms">
            <span className="tx-provider-card__price">
              {provider.price && provider.price > 0
                ? `From KES ${provider.price.toLocaleString()}`
                : 'Ask for price'}
            </span>
            {typeof provider.availableNow === 'boolean' && (
              <span className={`tx-provider-card__availability${provider.availableNow ? ' is-available' : ''}`}>
                <span aria-hidden="true"></span>{provider.availableNow ? 'Available now' : 'Check availability'}
              </span>
            )}
          </div>

          <div className="tx-provider-card__actions">
            <Link href={provider.href} className="btn btn-primary tx-provider-card__profile-action">
              View profile
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-success tx-provider-card__whatsapp-action"
              aria-label={`Ask Fudari about ${provider.name} on WhatsApp`}
            >
              <i className="fa-brands fa-whatsapp" aria-hidden="true"></i>
              <span>Ask Fudari</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}