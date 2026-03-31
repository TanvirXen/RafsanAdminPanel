"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PaginationControlsProps = {
  page: number
  totalPages: number
  totalItems?: number
  currentCount?: number
  itemLabel?: string
  isLoading?: boolean
  onPageChange: (page: number) => void
  className?: string
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  currentCount,
  itemLabel = "items",
  isLoading = false,
  onPageChange,
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1 && totalItems === undefined) {
    return null
  }

  const summary =
    totalItems === undefined
      ? null
      : `Showing ${currentCount ?? 0} of ${totalItems} ${itemLabel}`

  return (
    <div className={cn("flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="text-sm text-muted-foreground">
        {summary ? `${summary} • ` : ""}
        Page {page} of {Math.max(totalPages, 1)}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
