"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRole = "admin" | "editor";

export type UserFormShape = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
};

type UserIdentity = {
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
};

interface UserFormProps {
  initialData?: UserIdentity;
  currentUserId?: string;
  onSave: (data: UserFormShape) => unknown;
  onCancel: () => void;
}

export function UserForm({
  initialData,
  currentUserId,
  onSave,
  onCancel,
}: UserFormProps) {
  const isEditing = Boolean(initialData?.id);
  const isSelf = Boolean(currentUserId && initialData?.id === currentUserId);
  const [formData, setFormData] = useState<UserFormShape>({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    role: initialData?.role ?? "editor",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormShape, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      role: initialData?.role ?? "editor",
      password: "",
    });
    setErrors({});
    setSubmitting(false);
  }, [initialData]);

  const set = <K extends keyof UserFormShape>(key: K, value: UserFormShape[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (data: UserFormShape) => {
    const next: Partial<Record<keyof UserFormShape, string>> = {};

    if (!data.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      next.email = "Enter a valid email address";
    }

    if (!data.role) {
      next.role = "Role is required";
    }

    if (!isEditing && !data.password.trim()) {
      next.password = "Password is required";
    } else if (data.password && data.password.trim().length < 8) {
      next.password = "Password must be at least 8 characters";
    }

    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const payload: UserFormShape = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
      password: formData.password.trim(),
    };

    const validationErrors = validate(payload);
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }

    const maybe = onSave(payload);
    if (maybe && typeof (maybe as Promise<unknown>).then === "function") {
      setSubmitting(true);
      (maybe as Promise<unknown>)
        .catch(() => {})
        .finally(() => setSubmitting(false));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="user-name">Name</Label>
        <Input
          id="user-name"
          value={formData.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Team member name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="user-email"
          type="email"
          inputMode="email"
          value={formData.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="name@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "user-email-error" : undefined}
          required
        />
        {errors.email && (
          <p id="user-email-error" className="text-sm text-red-500">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-role">
          Role <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.role}
          onValueChange={(value) => set("role", value as UserRole)}
          disabled={isSelf}
        >
          <SelectTrigger id="user-role" className="w-full" aria-invalid={!!errors.role}>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
          </SelectContent>
        </Select>
        {isSelf && (
          <p className="text-sm text-muted-foreground">
            Your own role cannot be changed from this screen.
          </p>
        )}
        {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-password">
          {isEditing ? "New Password" : "Password"}{" "}
          {!isEditing && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="user-password"
          type="password"
          value={formData.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder={isEditing ? "Leave blank to keep current password" : "Minimum 8 characters"}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "user-password-error" : undefined}
          required={!isEditing}
        />
        {errors.password && (
          <p id="user-password-error" className="text-sm text-red-500">
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEditing ? "Save User" : "Create User"}
        </Button>
      </div>
    </form>
  );
}
