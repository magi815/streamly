export default function ContentCardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Poster skeleton */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-gray-800" />

      {/* Title skeleton */}
      <div className="mt-2 space-y-2">
        <div className="h-4 w-3/4 rounded bg-gray-800" />
        <div className="h-3 w-1/2 rounded bg-gray-800" />
      </div>
    </div>
  );
}

export function ContentGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <ContentCardSkeleton key={i} />
      ))}
    </div>
  );
}
