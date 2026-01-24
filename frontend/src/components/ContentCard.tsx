import Image from 'next/image';
import Link from 'next/link';
import { Content } from '@/types/content';

interface ContentCardProps {
  content: Content;
}

// OTT 플랫폼 아이콘 매핑
const platformIcons: Record<string, { icon: string; color: string; name: string }> = {
  netflix: { icon: 'N', color: 'bg-red-600', name: '넷플릭스' },
  tving: { icon: 'T', color: 'bg-red-500', name: '티빙' },
  wavve: { icon: 'W', color: 'bg-blue-600', name: '웨이브' },
  watcha: { icon: 'W', color: 'bg-pink-500', name: '왓챠' },
  disney_plus: { icon: 'D+', color: 'bg-blue-700', name: '디즈니+' },
  apple_tv_plus: { icon: 'A', color: 'bg-gray-700', name: 'Apple TV+' },
  coupang_play: { icon: 'C', color: 'bg-yellow-500', name: '쿠팡플레이' },
};

export default function ContentCard({ content }: ContentCardProps) {
  const year = content.release_date?.split('-')[0] || '';
  const platforms = content.platforms || [];

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
              if (!iconInfo) return null;
              return (
                <div
                  key={platform.id}
                  className={`flex h-6 w-6 items-center justify-center rounded ${iconInfo.color} text-[10px] font-bold text-white`}
                  title={iconInfo.name}
                >
                  {iconInfo.icon}
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
      </div>

      <div className="mt-2">
        <h3 className="font-medium text-white line-clamp-1 group-hover:text-purple-400">
          {content.title}
        </h3>
        <p className="text-sm text-gray-400">
          {year} · {content.content_type === 'movie' ? '영화' : '드라마'}
        </p>
      </div>
    </Link>
  );
}
