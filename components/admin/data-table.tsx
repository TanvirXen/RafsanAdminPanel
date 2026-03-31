"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { PaginationControls } from "@/components/admin/pagination-controls"
import { Search, Plus, Pencil, Trash2 } from "lucide-react"

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onAdd?: () => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onBulkDelete?: (items: T[]) => Promise<boolean | void> | boolean | void
  isRowSelectable?: (item: T) => boolean
  bulkDeleteLabel?: string
  searchPlaceholder?: string
  title?: string
  page?: number
  totalPages?: number
  totalItems?: number
  paginationLabel?: string
  onPageChange?: (page: number) => void
  isPageLoading?: boolean
}

export function DataTable<T extends { _id?: string; id?: string }>({
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete,
  isRowSelectable,
  bulkDeleteLabel = "Delete Selected",
  searchPlaceholder = "Search...",
  title,
  page = 1,
  totalPages = 1,
  totalItems,
  paginationLabel = "items",
  onPageChange,
  isPageLoading = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const selectionEnabled = Boolean(onBulkDelete)
  const normalizedQuery = searchQuery.toLowerCase()
  const filteredData = useMemo(
    () =>
      data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(normalizedQuery),
        ),
      ),
    [data, normalizedQuery],
  )

  const getRowId = (item: T) => {
    const rawId = item._id ?? item.id
    return rawId ? String(rawId) : null
  }

  const selectableRows = useMemo(
    () =>
      selectionEnabled
        ? filteredData.filter((item) => {
            const id = getRowId(item)
            if (!id) return false
            return isRowSelectable ? isRowSelectable(item) : true
          })
        : [],
    [filteredData, isRowSelectable, selectionEnabled],
  )

  const selectableIds = useMemo(
    () => selectableRows.map((item) => getRowId(item)).filter(Boolean) as string[],
    [selectableRows],
  )

  useEffect(() => {
    if (!selectionEnabled) {
      setSelectedIds([])
      return
    }

    setSelectedIds((prev) => prev.filter((id) => selectableIds.includes(id)))
  }, [selectableIds, selectionEnabled])

  const selectedItems = selectableRows.filter((item) => {
    const id = getRowId(item)
    return id ? selectedIds.includes(id) : false
  })
  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length
  const someSelected = selectedIds.length > 0 && !allSelected
  const columnCount = columns.length + (selectionEnabled ? 1 : 0) + (onEdit || onDelete ? 1 : 0)

  const toggleRow = (item: T, checked: boolean) => {
    const id = getRowId(item)
    if (!id) return

    setSelectedIds((prev) =>
      checked
        ? Array.from(new Set([...prev, id]))
        : prev.filter((selectedId) => selectedId !== id),
    )
  }

  const toggleAllRows = (checked: boolean) => {
    setSelectedIds(checked ? selectableIds : [])
  }

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedItems.length === 0) return

    setIsBulkDeleting(true)

    try {
      const result = await onBulkDelete(selectedItems)
      if (result !== false) {
        setSelectedIds([])
      }
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 bg-background pl-9"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {selectionEnabled && selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selected
              </span>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isBulkDeleting ? "Deleting..." : bulkDeleteLabel}
              </Button>
            </div>
          )}
          {onAdd && (
            <Button onClick={onAdd} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add New
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <Table className="min-w-[720px] lg:min-w-full">
          <TableHeader>
            <TableRow>
              {selectionEnabled && (
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Select all rows"
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleAllRows(checked === true)}
                    disabled={selectableIds.length === 0}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={String(column.key)}>{column.label}</TableHead>
              ))}
              {(onEdit || onDelete) && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, index) => (
                <TableRow key={item._id || item.id || index}>
                  {selectionEnabled && (
                    <TableCell className="w-12 align-top">
                      <Checkbox
                        aria-label="Select row"
                        checked={(() => {
                          const id = getRowId(item)
                          return id ? selectedIds.includes(id) : false
                        })()}
                        disabled={
                          !getRowId(item) || (isRowSelectable ? !isRowSelectable(item) : false)
                        }
                        onCheckedChange={(checked) => toggleRow(item, checked === true)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      <div className="min-w-0">
                        {column.render ? column.render(item) : String(item[column.key as keyof T] || "-")}
                      </div>
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button variant="ghost" size="icon" onClick={() => onDelete(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {onPageChange && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          currentCount={filteredData.length}
          itemLabel={paginationLabel}
          isLoading={isPageLoading}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
