import { Metadata } from 'next';
import ContentCard from '@/components/ContentCard';
import { getTrending } from '@/lib/api';
import { mockTrending } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '인기 콘텐츠 - Streamly',
  description: '지금 가장 인기있는 영화와 드라마를 확인하세요',
};

export default async function TrendingPage() {
  let trending;

  try {
    trending = await getTrending();
  } catch (error) {
    console.error('API fetch failed, using mock data:', error);
    trending = mockTrending;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">🔥 인기 콘텐츠</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {trending.map((content) => (
          <ContentCard key={content.id} content={content} />
        ))}
      </div>
    </div>
  );
}
