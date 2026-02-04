'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Content } from '@/types/content';
import ContentCard from './ContentCard';

interface ContentSectionProps {
  title: string;
  contents: Content[];
  viewAllHref?: string;
}

export default function ContentSection({ title, contents, viewAllHref }: ContentSectionProps) {
  const t = useTranslations('home');

  return (
    <section className="py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm text-gray-400 hover:text-purple-400"
          >
            {t('viewAll')} →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {contents.map((content) => (
          <ContentCard key={content.id} content={content} />
        ))}
      </div>
    </section>
  );
}
