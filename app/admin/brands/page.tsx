"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BrandForm } from "@/components/admin/forms/brand-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, ImageIcon } from "lucide-react"
import Image from "next/image"

interface Brand {
  _id: string
  brandName: string
  imageLink: string
  externalLink: string
}

const mockBrands: Brand[] = [
  {
    _id: "1",
    brandName: "TechCorp",
    imageLink: "/techcorp-logo.png",
    externalLink: "https://techcorp.example.com",
  },
  {
    _id: "2",
    brandName: "InnovateLabs",
    imageLink: "/innovatelabs-logo.png",
    externalLink: "https://innovatelabs.example.com",
  },
  {
    _id: "3",
    brandName: "DevTools Inc",
    imageLink: "/devtools-logo.jpg",
    externalLink: "https://devtools.example.com",
  },
  {
    _id: "4",
    brandName: "CloudSystems",
    imageLink: "/cloudsystems-logo.jpg",
    externalLink: "https://cloudsystems.example.com",
  },
]

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>(mockBrands)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid")

  const handleAdd = () => {
    setEditingBrand(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setIsDialogOpen(true)
  }

  const handleDelete = (brand: Brand) => {
    if (confirm(`Are you sure you want to delete "${brand.brandName}"?`)) {
      setBrands(brands.filter((b) => b._id !== brand._id))
    }
  }

  const handleSave = (data: Partial<Brand>) => {
    if (editingBrand) {
      setBrands(brands.map((b) => (b._id === editingBrand._id ? { ...b, ...data } : b)))
    } else {
      setBrands([...brands, { _id: Date.now().toString(), ...data } as Brand])
    }
    setIsDialogOpen(false)
  }

  const columns = [
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
          <span className="text-xs text-muted-foreground">Logo attached</span>
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
  ]

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

      {viewMode === "table" ? (
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
