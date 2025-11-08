"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandForm } from "@/components/admin/forms/brand-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, ImageIcon, List, Grid3x3 } from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";

interface Brand {
  _id: string;
  brandName: string;
  imageLink: string;
  externalLink: string;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");

  // confirm dialog state (no window.alert)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmResolveRef = useRef<((v: boolean) => void) | undefined>(
    undefined
  );

  const askConfirm = (title: string, desc: string) =>
    new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmTitle(title);
      setConfirmDesc(desc);
      setConfirmOpen(true);
    });
  const resolveConfirm = (v: boolean) => {
    setConfirmOpen(false);
    confirmResolveRef.current?.(v);
    confirmResolveRef.current = undefined;
  };

  /* load */
  useEffect(() => {
    (async () => {
      try {
        const j = await apiFetch<{ brands: Brand[] }>(apiList.brands.list);
        setBrands(j.brands || []);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load brands");
      }
    })();
  }, []);

  /* CRUD */
  const handleAdd = () => {
    setEditingBrand(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setIsDialogOpen(true);
  };

  const handleDelete = async (brand: Brand) => {
    const ok = await askConfirm(
      "Delete Brand",
      `Are you sure you want to delete "${brand.brandName}"?`
    );
    if (!ok) return;

    try {
      await apiFetch(apiList.brands.delete(brand._id), { method: "DELETE" });
      setBrands((prev) => prev.filter((b) => b._id !== brand._id));
      toast.success("Brand deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete brand");
    }
  };

  const handleSave = async (data: Partial<Brand>) => {
    try {
      if (editingBrand) {
        // update (PUT)
        const j = await apiFetch<{ brand: Brand }>(
          apiList.brands.update(editingBrand._id),
          { method: "PUT", body: JSON.stringify(data) }
        );
        setBrands((prev) =>
          prev.map((b) => (b._id === editingBrand._id ? j.brand : b))
        );
        toast.success("Brand updated");
      } else {
        // create
        const j = await apiFetch<{ brand: Brand }>(apiList.brands.create, {
          method: "POST",
          body: JSON.stringify(data),
        });
        setBrands((prev) => [j.brand, ...prev]);
        toast.success("Brand created");
      }
      setIsDialogOpen(false);
    } catch (e: any) {
      toast.error(
        e?.message ||
          (editingBrand ? "Failed to update brand" : "Failed to create brand")
      );
    }
  };

  /* table columns */
  const columns = [
    {
      key: "brandName",
      label: "Brand Name",
      render: (brand: Brand) => (
        <span className='font-medium'>{brand.brandName}</span>
      ),
    },
    {
      key: "imageLink",
      label: "Logo",
      render: (brand: Brand) => (
        <div className='flex items-center gap-2'>
          <ImageIcon className='h-4 w-4 text-muted-foreground' />
          <span className='text-xs text-muted-foreground'>Logo attached</span>
        </div>
      ),
    },
    {
      key: "externalLink",
      label: "Website",
      render: (brand: Brand) => (
        <a
          href={brand.externalLink}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center gap-1 text-sm text-blue-600 hover:underline'
        >
          <ExternalLink className='h-3 w-3' />
          Visit
        </a>
      ),
    },
  ];

  return (
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <div className='flex items-center justify-between'>
        <PageHeader
          title='Brands'
          description='Manage partner brands and sponsors'
        />
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setViewMode("table")}
          >
            <List className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className='h-4 w-4' />
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
          searchPlaceholder='Search brands...'
        />
      ) : (
        <div className='space-y-4'>
          <div className='flex justify-end'>
            <Button onClick={handleAdd}>Add New Brand</Button>
          </div>
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {brands.map((brand) => (
              <Card key={brand._id} className='overflow-hidden'>
                <CardHeader className='p-0'>
                  <div className='relative aspect-video w-full bg-muted'>
                    <Image
                      src={brand.imageLink || "/placeholder.svg"}
                      alt={brand.brandName}
                      fill
                      className='object-contain p-4'
                    />
                  </div>
                </CardHeader>
                <CardContent className='p-4'>
                  <CardTitle className='text-lg'>{brand.brandName}</CardTitle>
                  <CardDescription className='mt-2'>
                    <a
                      href={brand.externalLink}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1 text-sm text-blue-600 hover:underline'
                    >
                      <ExternalLink className='h-3 w-3' />
                      Visit Website
                    </a>
                  </CardDescription>
                  <div className='mt-4 flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleEdit(brand)}
                      className='flex-1'
                    >
                      Edit
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDelete(brand)}
                      className='flex-1'
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Form dialog (scrollable) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='w-[95vw] sm:max-w-md max-h-[85vh] p-0 overflow-hidden'>
          <DialogHeader className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4'>
            <DialogTitle>
              {editingBrand ? "Edit Brand" : "Add New Brand"}
            </DialogTitle>
          </DialogHeader>
          <div className='overflow-y-auto px-6 py-5 max-h-[calc(85vh-64px)]'>
            <BrandForm
              initialData={editingBrand || undefined}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) resolveConfirm(false);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>{confirmDesc}</p>
          <div className='mt-6 flex justify-end gap-2'>
            <Button variant='outline' onClick={() => resolveConfirm(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={() => resolveConfirm(true)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
