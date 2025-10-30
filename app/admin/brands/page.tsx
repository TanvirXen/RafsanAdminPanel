"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { ExternalLink, ImageIcon } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BrandForm } from "@/components/admin/forms/brand-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiDelete, apiFetch, apiPost, apiPut } from "@/lib/client/api"

interface Brand {
  _id: string
  brandName: string
  imageLink: string
  externalLink: string
  createdAt?: string
  updatedAt?: string
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrands = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ brands: Brand[] }>("/api/brands")
      setBrands(data.brands)
    } catch (err) {
      setError((err as Error).message || "Failed to load brands")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchBrands()
  }, [fetchBrands])

  const handleAdd = () => {
    setEditingBrand(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setIsDialogOpen(true)
  }

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`Are you sure you want to delete "${brand.brandName}"?`)) {
      return
    }
    try {
      await apiDelete(`/api/brands/${brand._id}`)
      setBrands((prev) => prev.filter((b) => b._id !== brand._id))
    } catch (err) {
      alert((err as Error).message || "Failed to delete brand")
    }
  }

  const handleSave = async (data: Partial<Brand>) => {
    try {
      if (editingBrand) {
        const response = await apiPut<{ brand: Brand }>(`/api/brands/${editingBrand._id}`, data)
        setBrands((prev) => prev.map((brand) => (brand._id === editingBrand._id ? response.brand : brand)))
      } else {
        const response = await apiPost<{ brand: Brand }>("/api/brands", data)
        setBrands((prev) => [response.brand, ...prev])
      }
      setIsDialogOpen(false)
    } catch (err) {
      alert((err as Error).message || "Failed to save brand")
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "brandName",
        label: "Brand Name",
        render: (brand: Brand) => <span className="font-medium">{brand.brandName}</span>,
      },
      {
        key: "imageLink",
        label: "Logo",
        render: (brand: Brand) => (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {brand.imageLink ? "Logo attached" : "No logo"}
            </span>
          </div>
        ),
      },
      {
        key: "externalLink",
        label: "Website",
        render: (brand: Brand) => (
          <a
            href={brand.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Visit
          </a>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <PageHeader title="Brands" description="Manage partner brands and sponsors" />
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
            Table
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            Grid
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <span className="text-muted-foreground">Loading brands...</span>
        </div>
      ) : viewMode === "table" ? (
        <DataTable
          data={brands}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchPlaceholder="Search brands..."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleAdd}>Add New Brand</Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {brands.map((brand) => (
              <Card key={brand._id} className="overflow-hidden">
                <CardHeader className="p-0">
                  <div className="relative aspect-video w-full bg-muted">
                    <Image
                      src={brand.imageLink || "/placeholder.svg"}
                      alt={brand.brandName}
                      fill
                      className="object-contain p-4"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg">{brand.brandName}</CardTitle>
                  <CardDescription className="mt-2">
                    <a
                      href={brand.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Visit Website
                    </a>
                  </CardDescription>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(brand)} className="flex-1">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(brand)} className="flex-1">
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? "Edit Brand" : "Add New Brand"}</DialogTitle>
          </DialogHeader>
          <BrandForm initialData={editingBrand} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
