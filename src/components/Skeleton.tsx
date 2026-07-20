import { cn } from "../lib/cn";

interface SkeletonProps {
  className?: string;
  variant?: "card" | "hero" | "detail" | "row" | "grid" | "search" | "player";
  count?: number;
  shimmer?: boolean;
}

export function Skeleton({ 
  className, 
  variant = "card", 
  count = 1,
  shimmer = true 
}: SkeletonProps) {
  const baseClass = shimmer ? "animate-shimmer" : "animate-pulse";
  
  const variants: Record<string, JSX.Element> = {
    card: (
      <div className={cn("bg-zinc-900 rounded-md overflow-hidden", className)}>
        <div className={cn("aspect-[2/3] bg-zinc-800", baseClass)} />
        <div className="p-3 space-y-2">
          <div className={cn("h-4 bg-zinc-800 rounded w-3/4", baseClass)} />
          <div className={cn("h-3 bg-zinc-800 rounded w-1/2", baseClass)} />
          <div className="flex gap-1 mt-2">
            <div className={cn("h-2 bg-zinc-800 rounded w-1/3", baseClass)} />
            <div className={cn("h-2 bg-zinc-800 rounded w-1/3", baseClass)} />
          </div>
        </div>
      </div>
    ),
    
    hero: (
      <div className={cn("h-[85vh] bg-zinc-900 relative overflow-hidden", className)}>
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-10 space-y-4 w-full max-w-2xl">
          <div className={cn("h-16 bg-zinc-700 rounded w-3/4", baseClass)} />
          <div className={cn("h-4 bg-zinc-700 rounded w-1/2", baseClass)} />
          <div className={cn("h-24 bg-zinc-700 rounded w-full", baseClass)} />
          <div className="flex gap-3">
            <div className={cn("h-12 w-32 bg-zinc-700 rounded", baseClass)} />
            <div className={cn("h-12 w-32 bg-zinc-700 rounded", baseClass)} />
          </div>
        </div>
      </div>
    ),
    
    detail: (
      <div className={cn("animate-pulse", className)}>
        <div className="h-[60vh] bg-zinc-800" />
        <div className="px-4 md:px-10 -mt-48 relative">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10">
            <div className={cn("w-44 md:w-64 h-64 md:h-96 bg-zinc-700 rounded-lg shrink-0", baseClass)} />
            <div className="flex-1 space-y-4">
              <div className={cn("h-12 bg-zinc-700 rounded w-3/4", baseClass)} />
              <div className={cn("h-4 bg-zinc-700 rounded w-1/2", baseClass)} />
              <div className="flex gap-2">
                <div className={cn("h-6 w-16 bg-zinc-700 rounded-full", baseClass)} />
                <div className={cn("h-6 w-16 bg-zinc-700 rounded-full", baseClass)} />
                <div className={cn("h-6 w-16 bg-zinc-700 rounded-full", baseClass)} />
              </div>
              <div className={cn("h-24 bg-zinc-700 rounded w-full", baseClass)} />
              <div className="flex gap-3">
                <div className={cn("h-12 w-32 bg-zinc-700 rounded", baseClass)} />
                <div className={cn("h-12 w-32 bg-zinc-700 rounded", baseClass)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    
    row: (
      <div className={cn("flex gap-2 md:gap-3 overflow-hidden", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-32 md:w-40 shrink-0">
            <div className={cn("aspect-[2/3] bg-zinc-800 rounded-md", baseClass)} />
          </div>
        ))}
      </div>
    ),
    
    grid: (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    ),
    
    search: (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
            <div className={cn("w-12 h-16 bg-zinc-800 rounded", baseClass)} />
            <div className="flex-1 space-y-2">
              <div className={cn("h-4 bg-zinc-800 rounded w-3/4", baseClass)} />
              <div className={cn("h-3 bg-zinc-800 rounded w-1/2", baseClass)} />
            </div>
          </div>
        ))}
      </div>
    ),
    
    player: (
      <div className={cn("w-full h-full bg-zinc-900 relative", className)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-zinc-700 border-t-[#e50914] animate-spin" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          <div className={cn("h-1 bg-zinc-700 rounded w-full", baseClass)} />
          <div className="flex items-center gap-3">
            <div className={cn("h-6 w-6 bg-zinc-700 rounded-full", baseClass)} />
            <div className={cn("h-6 w-6 bg-zinc-700 rounded-full", baseClass)} />
            <div className="flex-1" />
            <div className={cn("h-6 w-6 bg-zinc-700 rounded-full", baseClass)} />
            <div className={cn("h-6 w-6 bg-zinc-700 rounded-full", baseClass)} />
          </div>
        </div>
      </div>
    ),
  };

  return variants[variant] || variants.card;
}

// Convenience component for multiple skeletons
export function SkeletonGrid({ count = 12, ...props }: Omit<SkeletonProps, 'count'> & { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" {...props} />
      ))}
    </div>
  );
}

// Loading overlay for components
export function LoadingOverlay({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
      <div className="w-12 h-12 border-4 border-zinc-700 border-t-[#e50914] rounded-full animate-spin" />
      <p className="text-white text-sm mt-4">{message}</p>
    </div>
  );
}