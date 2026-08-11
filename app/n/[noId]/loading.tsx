import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingNotePage() {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full">
      {/* Top Header / Breadcrumb */}
      <div className="h-11 border-b border-border/60 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <span className="text-muted-foreground/40">/</span>
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-12 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-md" />
          <Skeleton className="h-6 w-13.5 rounded-md" />
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>
      </div>

      {/* Editor Content Area Skeleton */}
      <div className="flex-1 p-8 max-w-4xl w-full mx-auto space-y-6 overflow-hidden">
        {/* Title */}
        <Skeleton className="h-10 w-2/3 rounded-lg" />

        {/* Paragraphs */}
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <div className="space-y-3 pt-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}
