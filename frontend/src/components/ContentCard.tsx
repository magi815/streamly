'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Content } from '@/types/content';

interface ContentCardProps {
  content: Content;
}

// OTT 플랫폼 아이콘 매핑 (KR, US, JP)
const platformIcons: Record<string, { icon: string; color: string; name: string }> = {
  // Korea
  netflix: { icon: 'N', color: 'bg-red-600', name: 'Netflix' },
  tving: { icon: 'T', color: 'bg-red-500', name: 'TVING' },
  wavve: { icon: 'W', color: 'bg-blue-600', name: 'Wavve' },
  watcha: { icon: 'Wc', color: 'bg-pink-500', name: 'Watcha' },
  disney_plus: { icon: 'D+', color: 'bg-blue-700', name: 'Disney+' },
  apple_tv_plus: { icon: 'A+', color: 'bg-gray-700', name: 'Apple TV+' },
  coupang_play: { icon: 'CP', color: 'bg-yellow-500', name: 'Coupang Play' },
  // US
  amazon_prime: { icon: 'P', color: 'bg-blue-500', name: 'Prime Video' },
  hulu: { icon: 'H', color: 'bg-green-500', name: 'Hulu' },
  max: { icon: 'M', color: 'bg-purple-600', name: 'Max' },
  paramount_plus: { icon: 'P+', color: 'bg-blue-800', name: 'Paramount+' },
  // Japan
  u_next: { icon: 'U', color: 'bg-blue-400', name: 'U-NEXT' },
  dtv: { icon: 'dT', color: 'bg-red-400', name: 'dTV' },
  abema: { icon: 'Ab', color: 'bg-green-600', name: 'ABEMA' },
};

export default function ContentCard({ content }: ContentCardProps) {
  const t = useTranslations('filter');
  const year = content.release_date?.split('-')[0] || '';

  // 플랫폼 중복 제거 (code 기준)
  const platforms = (content.platforms || []).filter(
    (platform, index, self) =>
      index === self.findIndex(p => p.code === platform.code)
  );

  const reviewCount = content.review_count || 0;

  return (
    <Link href={`/content/${content.id}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-800">
        {content.poster_url ? (
          <Image
            src={content.poster_url}
            alt={content.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-700">
            <span className="text-gray-400">No Image</span>
          </div>
        )}

        {/* Platform Icons */}
        {platforms.length > 0 && (
          <div className="absolute top-2 right-2 flex gap-1">
            {platforms.slice(0, 3).map((platform) => {
              const iconInfo = platformIcons[platform.code];
              // 아이콘 정보가 없으면 기본 아이콘 사용
              const icon = iconInfo?.icon || platform.code?.charAt(0).toUpperCase() || '?';
              const color = iconInfo?.color || 'bg-gray-600';
              const name = iconInfo?.name || platform.name || platform.code;
              return (
                <div
                  key={platform.code}
                  className={`flex h-6 w-6 items-center justify-center rounded ${color} text-[10px] font-bold text-white`}
                  title={name}
                >
                  {icon}
                </div>
              );
            })}
            {platforms.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-600 text-[10px] font-bold text-white">
                +{platforms.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Review Count Badge */}
        {reviewCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5">
            <svg
              className="h-3.5 w-3.5 text-red-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
            <span className="text-xs font-medium text-white">{reviewCount}</span>
          </div>
        )}
      </div>

      <div className="mt-2">
        <h3 className="font-medium text-white line-clamp-1 group-hover:text-purple-400">
          {content.title}
        </h3>
        <p className="text-sm text-gray-400">
          {year} · {content.content_type === 'movie' ? t('movie') : t('drama')}
        </p>
      </div>
    </Link>
  );
}
