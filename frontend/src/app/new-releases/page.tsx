import { Metadata } from 'next';
import ContentCard from '@/components/ContentCard';
import { getNewReleases } from '@/lib/api';
import { mockNewReleases } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '신작 콘텐츠 - Streamly',
  description: '최신 영화와 드라마를 확인하세요',
};

export default async function NewReleasesPage() {
  let newReleases;

  try {
    newReleases = await getNewReleases();
  } catch (error) {
    console.error('API fetch failed, using mock data:', error);
    newReleases = mockNewReleases;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">✨ 신작 콘텐츠</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {newReleases.map((content) => (
          <ContentCard key={content.id} content={content} />
        ))}
      </div>
    </div>
  );
}
