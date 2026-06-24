"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUpload } from "@/components/admin/image-upload";
import { Plus, X, GripVertical } from "lucide-react";
import { toast } from "react-toastify";
import { EventScheduleEditor } from "@/components/admin/forms/EventScheduleEditor";
import {
  formatRangeDayLabel,
  inferScheduleFromEvent,
  normalizeEventCategoryValue,
  type EventCategory,
  type EventScheduleFormValue,
  type LegacyOccurrence,
  type RangeDay,
} from "@/lib/event-schedule";

type EventType = "Free" | "Free_with_approval" | "Paid" | "Paid_with_approval";
type Brand = { _id: string; brandName: string; imageLink?: string };

interface CustomField {
  id: string;
  name: string;
  type: "text" | "email" | "phone" | "number" | "select" | "textarea";
  label: string;
  required: boolean;
  options?: string[];
}

interface EventFormData {
  title: string;
  showKey: string;
  venue: string;
  type: EventType;
  description: string;
  imageLinkBg: string;
  imageLinkOverlay: string;
  brands: string[];
  customFields: CustomField[];
  category: EventCategory;
  ticketUrl: string;
  city: string;
  country: string;
  schedule: EventScheduleFormValue;
}

interface EventFormProps {
  initialData?: {
    title?: string;
    slug?: string;
    showKey?: string;
    scheduleMode?: string;
    singleDateTime?: string | null;
    rangeStartDate?: string;
    rangeEndDate?: string;
    rangeDays?: RangeDay[];
    occurrences?: LegacyOccurrence[];
    date?: string[];
    venue?: string;
    type?: EventType;
    description?: string;
    imageLinkBg?: string;
    imageLinkOverlay?: string;
    brands?: Array<string | { _id: string; brandName?: string }>;
    customFields?: CustomField[] | unknown;
    category?: string;
    ticketUrl?: string;
    city?: string;
    country?: string;
  };
  brands?: Brand[];
  onBrandsChange?: (ids: string[]) => void;
  onSave: (data: EventFormData) => void;
  onCancel: () => void;
}

interface CustomFieldErrors {
  label?: string;
  name?: string;
  options?: string;
}

interface EventFormErrors {
  title?: string;
  venue?: string;
  ticketUrl?: string;
  showKey?: string;
  imageLinkBg?: string;
  imageLinkOverlay?: string;
  schedule?: string;
  singleDateTime?: string;
  rangeStartDate?: string;
  rangeEndDate?: string;
  rangeDays?: string;
  customFields: Record<string, CustomFieldErrors>;
}

const mkId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const makeEmptyErrors = (): EventFormErrors => ({
  customFields: {},
});

const buildCustomFieldName = (value: string) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['\u2019]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    return "";
  }

  return /^[0-9]/.test(normalized) ? `field_${normalized}` : normalized;
};

const makeField = (partial: Partial<CustomField> = {}): CustomField => ({
  id: partial.id || mkId(),
  name: buildCustomFieldName(
    typeof partial.name === "string" && partial.name.trim().length
      ? partial.name
      : typeof partial.label === "string"
        ? partial.label
        : ""
  ),
  type: partial.type || "text",
  label: typeof partial.label === "string" ? partial.label : "",
  required: Boolean(partial.required),
  options: Array.isArray(partial.options)
    ? partial.options.map((value) => String(value))
    : [],
});

const slugifyShowKey = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['\u2019]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const sanitizeFields = (raw: unknown): CustomField[] =>
  (Array.isArray(raw) ? raw : [])
    .filter((field) => field && typeof field === "object")
    .map((field) => makeField(field as Partial<CustomField>));

const getDefaultCustomFields = (): CustomField[] => [
  makeField({ label: "Full Name", type: "text", required: true }),
  makeField({ label: "Facebook Profile Link", type: "text", required: true }),
  makeField({ label: "Email", type: "email", required: true }),
  makeField({ label: "Phone Number", type: "phone", required: true }),
  makeField({ label: "Which Episode do you wish to attend?", type: "text", required: true }),
  makeField({ label: "Tell us how you feel about WHAT A SHOW!", type: "textarea", required: true }),
  makeField({ label: "Any question for the guests?", type: "textarea", required: false }),
  makeField({
    label: "If you want to increase your chances of being selected, share a video of what a show on social media with the hashtag #whataseason5. Put the link of your post in this box!",
    type: "text",
    required: false,
  }),
];

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeCustomFieldsForSave = (fields: CustomField[]) =>
  fields.map((field) => ({
    ...field,
    label: field.label.trim(),
    name: buildCustomFieldName(field.name || field.label),
    options:
      field.type === "select"
        ? (field.options || []).map((option) => option.trim()).filter(Boolean)
        : [],
  }));

const hasValidationErrors = (errors: EventFormErrors) =>
  Boolean(
    errors.title ||
      errors.venue ||
      errors.ticketUrl ||
      errors.showKey ||
      errors.imageLinkBg ||
      errors.imageLinkOverlay ||
      errors.schedule ||
      errors.singleDateTime ||
      errors.rangeStartDate ||
      errors.rangeEndDate ||
      errors.rangeDays ||
      Object.values(errors.customFields).some(
        (fieldErrors) =>
          fieldErrors.label || fieldErrors.name || fieldErrors.options
      )
  );

function buildInitialFormData(
  initialData: EventFormProps["initialData"],
  brands: Brand[]
): EventFormData {
  const sourceBrands = initialData?.brands ?? [];
  const byName = new Map(brands.map((brand) => [brand.brandName, brand._id]));
  const brandIds = Array.from(
    new Set(
      sourceBrands
        .map((brand) => {
          if (!brand) {
            return null;
          }

          if (typeof brand === "string") {
            return brands.find((candidate) => candidate._id === brand)?._id || byName.get(brand) || null;
          }

          return brand._id || byName.get(brand.brandName || "") || null;
        })
        .filter(Boolean) as string[]
    )
  );

  return {
    title: initialData?.title || "",
    showKey:
      initialData?.showKey ||
      (normalizeEventCategoryValue(initialData?.category) === "what_a_show"
        ? initialData?.slug || ""
        : ""),
    venue: initialData?.venue || "",
    type: initialData?.type || "Free",
    description: initialData?.description || "",
    imageLinkBg: initialData?.imageLinkBg || "",
    imageLinkOverlay: initialData?.imageLinkOverlay || "",
    brands: brandIds,
    customFields: initialData
      ? sanitizeFields(initialData.customFields)
      : getDefaultCustomFields(),
    category: normalizeEventCategoryValue(initialData?.category),
    ticketUrl: initialData?.ticketUrl || "",
    city: initialData?.city || "",
    country: initialData?.country || "",
    schedule: inferScheduleFromEvent(initialData),
  };
}

export function EventForm({
  initialData,
  brands = [],
  onBrandsChange,
  onSave,
  onCancel,
}: EventFormProps) {
  const initialFormData = useMemo(
    () => buildInitialFormData(initialData, brands),
    [initialData, brands]
  );
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [errors, setErrors] = useState<EventFormErrors>(makeEmptyErrors());
  const isWhatAShow = formData.category === "what_a_show";
  const generatedShowKey = useMemo(
    () => (isWhatAShow ? slugifyShowKey(formData.title) : ""),
    [isWhatAShow, formData.title]
  );

  useEffect(() => {
    setFormData(initialFormData);
    setErrors(makeEmptyErrors());
  }, [initialFormData]);

  const clearErrors = (
    ...keys: Array<Exclude<keyof EventFormErrors, "customFields">>
  ) => {
    setErrors((current) => {
      let changed = false;
      const next = { ...current };

      for (const key of keys) {
        if (next[key]) {
          next[key] = undefined;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  };

  const clearCustomFieldErrors = (
    fieldId: string,
    ...keys: Array<keyof CustomFieldErrors>
  ) => {
    setErrors((current) => {
      const existing = current.customFields[fieldId];
      if (!existing) {
        return current;
      }

      if (!keys.length) {
        const nextCustomFields = { ...current.customFields };
        delete nextCustomFields[fieldId];
        return { ...current, customFields: nextCustomFields };
      }

      const nextFieldErrors = { ...existing };
      let changed = false;

      for (const key of keys) {
        if (nextFieldErrors[key]) {
          nextFieldErrors[key] = undefined;
          changed = true;
        }
      }

      if (!changed) {
        return current;
      }

      const hasRemainingErrors = Object.values(nextFieldErrors).some(Boolean);
      const nextCustomFields = { ...current.customFields };

      if (hasRemainingErrors) {
        nextCustomFields[fieldId] = nextFieldErrors;
      } else {
        delete nextCustomFields[fieldId];
      }

      return {
        ...current,
        customFields: nextCustomFields,
      };
    });
  };

  const validateForm = (): EventFormErrors => {
    const nextErrors = makeEmptyErrors();

    if (!formData.title.trim()) {
      nextErrors.title = "Event title is required";
    }

    if (!formData.venue.trim()) {
      nextErrors.venue = "Venue is required";
    }

    if (formData.ticketUrl.trim() && !isValidHttpUrl(formData.ticketUrl.trim())) {
      nextErrors.ticketUrl = "Enter a valid ticket URL starting with http or https";
    }

    if (isWhatAShow) {
      if (!formData.title.trim()) {
        nextErrors.showKey = "Add a title to generate the What a Show key";
      } else if (!generatedShowKey.trim()) {
        nextErrors.showKey =
          "The What a Show key could not be generated from this title";
      }

      if (!formData.imageLinkBg.trim()) {
        nextErrors.imageLinkBg =
          "Banner image is required for What a Show events";
      }
    } else {
      if (!formData.imageLinkBg.trim()) {
        nextErrors.imageLinkBg =
          "Background image is required for Other events";
      }

      if (!formData.imageLinkOverlay.trim()) {
        nextErrors.imageLinkOverlay =
          "Overlay image is required for Other events";
      }
    }

    if (formData.schedule.scheduleMode === "single") {
      if (!formData.schedule.singleDateTime.trim()) {
        nextErrors.schedule = "Complete the schedule section";
        nextErrors.singleDateTime = "Date and time is required";
      }
    } else {
      const { rangeStartDate, rangeEndDate, rangeDays } = formData.schedule;

      if (!rangeStartDate.trim()) {
        nextErrors.rangeStartDate = "Start date is required";
      }

      if (!rangeEndDate.trim()) {
        nextErrors.rangeEndDate = "End date is required";
      } else if (rangeStartDate.trim() && rangeEndDate < rangeStartDate) {
        nextErrors.rangeEndDate =
          "End date must be on or after the start date";
      }

      if (!nextErrors.rangeStartDate && !nextErrors.rangeEndDate) {
        if (!rangeDays.length) {
          nextErrors.rangeDays =
            "Choose a valid date range to generate day-by-day timings";
        } else {
          const activeDays = rangeDays.filter((day) => day.enabled);

          if (!activeDays.length) {
            nextErrors.rangeDays =
              "At least one active day is required in the date range";
          } else {
            const missingStartTimeDay = activeDays.find(
              (day) => !day.startTime.trim()
            );

            if (missingStartTimeDay) {
              nextErrors.rangeDays = `Add a start time for ${formatRangeDayLabel(
                missingStartTimeDay.date
              )}`;
            }
          }
        }
      }

      if (
        nextErrors.rangeStartDate ||
        nextErrors.rangeEndDate ||
        nextErrors.rangeDays
      ) {
        nextErrors.schedule = "Complete the schedule section";
      }
    }

    const normalizedCustomFields = formData.customFields.map((field) => ({
      ...field,
      label: field.label.trim(),
      name: buildCustomFieldName(field.name || field.label),
      options: (field.options || []).map((option) => option.trim()),
    }));
    const fieldIdsByName = new Map<string, string[]>();

    for (const field of normalizedCustomFields) {
      const fieldErrors: CustomFieldErrors = {};

      if (!field.label) {
        fieldErrors.label = "Field label is required";
      }

      if (!field.name) {
        fieldErrors.name = "Field ID will be generated once the label is filled";
      } else {
        const ids = fieldIdsByName.get(field.name) || [];
        ids.push(field.id);
        fieldIdsByName.set(field.name, ids);
      }

      if (field.type === "select") {
        const rawOptions = field.options || [];
        const hasEmptyOption = rawOptions.some((option) => !option.trim());

        if (!rawOptions.length) {
          fieldErrors.options = "Add at least one dropdown option";
        } else if (hasEmptyOption) {
          fieldErrors.options = "Remove empty dropdown options";
        }
      }

      if (fieldErrors.label || fieldErrors.name || fieldErrors.options) {
        nextErrors.customFields[field.id] = fieldErrors;
      }
    }

    for (const [, ids] of fieldIdsByName) {
      if (ids.length < 2) {
        continue;
      }

      for (const id of ids) {
        nextErrors.customFields[id] = {
          ...nextErrors.customFields[id],
          name: "Field ID must be unique. Change the label to make it different",
        };
      }
    }

    return nextErrors;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateForm();
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      toast.error("Please fix the highlighted fields");
      requestAnimationFrame(() => {
        const firstInvalid = document.querySelector<HTMLElement>(
          "[aria-invalid='true']"
        );
        firstInvalid?.focus();
        firstInvalid?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }

    const normalizedCustomFields = normalizeCustomFieldsForSave(
      formData.customFields
    );
    setErrors(makeEmptyErrors());
    onSave({
      ...formData,
      title: formData.title.trim(),
      showKey: isWhatAShow ? generatedShowKey : "",
      venue: formData.venue.trim(),
      description: formData.description.trim(),
      imageLinkBg: formData.imageLinkBg.trim(),
      imageLinkOverlay: isWhatAShow ? "" : formData.imageLinkOverlay.trim(),
      customFields: normalizedCustomFields,
      ticketUrl: formData.ticketUrl.trim(),
      city: formData.city.trim(),
      country: formData.country.trim(),
    });
  };

  const toggleBrand = (brandId: string, checked?: boolean) => {
    setFormData((current) => {
      const alreadySelected = current.brands.includes(brandId);
      const nextBrands = checked
        ? alreadySelected
          ? current.brands
          : [...current.brands, brandId]
        : current.brands.filter((id) => id !== brandId);

      onBrandsChange?.(nextBrands);

      return {
        ...current,
        brands: Array.from(new Set(nextBrands)),
      };
    });
  };

  const addCustomField = () =>
    setFormData((current) => ({
      ...current,
      customFields: [...current.customFields, makeField()],
    }));

  const removeCustomField = (id: string) => {
    clearCustomFieldErrors(id);
    setFormData((current) => ({
      ...current,
      customFields: current.customFields.filter((field) => field.id !== id),
    }));
  };

  const updateCustomField = (id: string, patch: Partial<CustomField>) => {
    if ("label" in patch) {
      clearCustomFieldErrors(id, "label", "name");
    }
    if ("type" in patch) {
      clearCustomFieldErrors(id, "options");
    }

    setFormData((current) => ({
      ...current,
      customFields: current.customFields.map((field) => {
        if (field.id !== id) {
          return field;
        }

        const nextField = { ...field, ...patch };
        if ("label" in patch) {
          nextField.name = buildCustomFieldName(String(patch.label || ""));
        }
        if ("type" in patch && patch.type !== "select") {
          nextField.options = [];
        }

        return makeField(nextField);
      }),
    }));
  };

  const addFieldOption = (fieldId: string) => {
    clearCustomFieldErrors(fieldId, "options");
    setFormData((current) => ({
      ...current,
      customFields: current.customFields.map((field) =>
        field.id === fieldId
          ? makeField({ ...field, options: [...(field.options || []), ""] })
          : field
      ),
    }));
  };

  const updateFieldOption = (
    fieldId: string,
    optionIndex: number,
    value: string
  ) => {
    clearCustomFieldErrors(fieldId, "options");
    setFormData((current) => ({
      ...current,
      customFields: current.customFields.map((field) => {
        if (field.id !== fieldId) {
          return field;
        }

        const nextOptions = [...(field.options || [])];
        nextOptions[optionIndex] = value;
        return makeField({ ...field, options: nextOptions });
      }),
    }));
  };

  const removeFieldOption = (fieldId: string, optionIndex: number) => {
    clearCustomFieldErrors(fieldId, "options");
    setFormData((current) => ({
      ...current,
      customFields: current.customFields.map((field) =>
        field.id === fieldId
          ? makeField({
              ...field,
              options: (field.options || []).filter(
                (_, index) => index !== optionIndex
              ),
            })
          : field
      ),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='space-y-2'>
        <Label htmlFor='title'>Event Title</Label>
        <Input
          id='title'
          value={formData.title}
          onChange={(event) => {
            clearErrors("title", "showKey");
            setFormData((current) => ({
              ...current,
              title: event.target.value,
            }));
          }}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "event-title-error" : undefined}
          required
        />
        {errors.title ? (
          <p id='event-title-error' className='text-sm text-destructive'>
            {errors.title}
          </p>
        ) : null}
      </div>

      <EventScheduleEditor
        value={formData.schedule}
        onChange={(schedule) => {
          clearErrors(
            "schedule",
            "singleDateTime",
            "rangeStartDate",
            "rangeEndDate",
            "rangeDays"
          );
          setFormData((current) => ({ ...current, schedule }));
        }}
        errors={{
          schedule: errors.schedule,
          singleDateTime: errors.singleDateTime,
          rangeStartDate: errors.rangeStartDate,
          rangeEndDate: errors.rangeEndDate,
          rangeDays: errors.rangeDays,
        }}
      />

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='venue'>Venue</Label>
          <Input
            id='venue'
            value={formData.venue}
            onChange={(event) => {
              clearErrors("venue");
              setFormData((current) => ({
                ...current,
                venue: event.target.value,
              }));
            }}
            aria-invalid={!!errors.venue}
            aria-describedby={errors.venue ? "venue-error" : undefined}
            required
          />
          {errors.venue ? (
            <p id='venue-error' className='text-sm text-destructive'>
              {errors.venue}
            </p>
          ) : null}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='type'>Event Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData((current) => ({
                ...current,
                type: value as EventType,
              }))
            }
          >
            <SelectTrigger id='type'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Free'>Free</SelectItem>
              <SelectItem value='Free_with_approval'>
                Free with Approval
              </SelectItem>
              <SelectItem value='Paid'>Paid</SelectItem>
              <SelectItem value='Paid_with_approval'>
                Paid with Approval
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='category'>Event Group</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => {
              clearErrors("showKey", "imageLinkBg", "imageLinkOverlay");
              setFormData((current) => ({
                ...current,
                category: value as EventCategory,
                imageLinkOverlay:
                  value === "what_a_show" ? "" : current.imageLinkOverlay,
              }));
            }}
          >
            <SelectTrigger id='category'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='what_a_show'>What a Show</SelectItem>
              <SelectItem value='other'>Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='ticketUrl'>Ticket URL</Label>
          <Input
            id='ticketUrl'
            value={formData.ticketUrl}
            onChange={(event) => {
              clearErrors("ticketUrl");
              setFormData((current) => ({
                ...current,
                ticketUrl: event.target.value,
              }));
            }}
            aria-invalid={!!errors.ticketUrl}
            aria-describedby={errors.ticketUrl ? "ticket-url-error" : undefined}
            placeholder='https://...'
          />
          {errors.ticketUrl ? (
            <p id='ticket-url-error' className='text-sm text-destructive'>
              {errors.ticketUrl}
            </p>
          ) : null}
        </div>
      </div>

      {isWhatAShow && (
        <div className='space-y-2'>
          <Label htmlFor='showKey'>What a Show Key</Label>
          <Input
            id='showKey'
            value={generatedShowKey}
            readOnly
            aria-invalid={!!errors.showKey}
            aria-describedby={errors.showKey ? "show-key-error" : undefined}
            placeholder='Generated from the event title'
          />
          <p className='text-sm text-muted-foreground'>
            This unique key is generated automatically from the event title and
            becomes the public event URL identifier.
          </p>
          {errors.showKey ? (
            <p id='show-key-error' className='text-sm text-destructive'>
              {errors.showKey}
            </p>
          ) : null}
        </div>
      )}

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='city'>City</Label>
          <Input
            id='city'
            value={formData.city}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                city: event.target.value,
              }))
            }
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='country'>Country</Label>
          <Input
            id='country'
            value={formData.country}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                country: event.target.value,
              }))
            }
          />
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='description'>Description</Label>
        <Textarea
          id='description'
          value={formData.description}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          rows={4}
        />
      </div>

      {isWhatAShow ? (
        <div className='space-y-2'>
          <ImageUpload
            label='Banner Image'
            value={formData.imageLinkBg}
            onChange={(imageLinkBg) => {
              clearErrors("imageLinkBg");
              setFormData((current) => ({ ...current, imageLinkBg }));
            }}
            placeholder='Upload banner image'
            required
            allowUrlInput={false}
            error={errors.imageLinkBg}
          />
          <p className='text-sm text-muted-foreground'>
            What a Show events use a single banner image only.
          </p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2'>
          <ImageUpload
            label='Background Image'
            value={formData.imageLinkBg}
            onChange={(imageLinkBg) => {
              clearErrors("imageLinkBg");
              setFormData((current) => ({ ...current, imageLinkBg }));
            }}
            placeholder='Upload background image'
            required
            allowUrlInput={false}
            error={errors.imageLinkBg}
          />
          <ImageUpload
            label='Overlay Image'
            value={formData.imageLinkOverlay}
            onChange={(imageLinkOverlay) => {
              clearErrors("imageLinkOverlay");
              setFormData((current) => ({ ...current, imageLinkOverlay }));
            }}
            placeholder='Upload overlay image'
            required
            allowUrlInput={false}
            error={errors.imageLinkOverlay}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Associated Brands</CardTitle>
          <CardDescription>
            Select brands that are sponsoring or associated with this event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-3 sm:grid-cols-2'>
            {brands.map((brand) => {
              const checked = formData.brands.includes(brand._id);
              return (
                <div key={brand._id} className='flex items-center space-x-2'>
                  <Checkbox
                    id={`brand-${brand._id}`}
                    checked={checked}
                    onCheckedChange={(nextChecked) =>
                      toggleBrand(brand._id, Boolean(nextChecked))
                    }
                  />
                  <label
                    htmlFor={`brand-${brand._id}`}
                    className='text-sm font-medium leading-none'
                  >
                    {brand.brandName}
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Registration Form Fields</CardTitle>
        </CardHeader>

        <CardContent className='space-y-4'>
          {formData.customFields.map((field, index) => {
            const fieldErrors = errors.customFields[field.id] || {};
            const hasFieldError = Boolean(
              fieldErrors.label || fieldErrors.name || fieldErrors.options
            );

            return (
              <Card
                key={field.id}
                className={
                  hasFieldError ? "border-2 border-destructive/60" : "border-2"
                }
              >
                <CardContent className='pt-6'>
                  <div className='space-y-4'>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='flex items-center gap-2'>
                        <GripVertical className='h-5 w-5 text-muted-foreground' />
                        <span className='text-sm font-medium text-muted-foreground'>
                          Field {index + 1}
                        </span>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => removeCustomField(field.id)}
                        className='h-8 w-8'
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label htmlFor={`field-label-${field.id}`}>
                          Field Label
                        </Label>
                        <Input
                          id={`field-label-${field.id}`}
                          value={field.label}
                          onChange={(event) =>
                            updateCustomField(field.id, {
                              label: event.target.value,
                            })
                          }
                          aria-invalid={!!fieldErrors.label}
                          aria-describedby={
                            fieldErrors.label
                              ? `field-label-${field.id}-error`
                              : undefined
                          }
                          placeholder='e.g., Full Name, Email Address'
                        />
                        {fieldErrors.label ? (
                          <p
                            id={`field-label-${field.id}-error`}
                            className='text-sm text-destructive'
                          >
                            {fieldErrors.label}
                          </p>
                        ) : null}
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor={`field-name-${field.id}`}>
                          Field Name (ID)
                        </Label>
                        <Input
                          id={`field-name-${field.id}`}
                          value={field.name}
                          readOnly
                          aria-invalid={!!fieldErrors.name}
                          aria-describedby={
                            fieldErrors.name
                              ? `field-name-${field.id}-error`
                              : `field-name-${field.id}-help`
                          }
                          className='font-mono'
                          placeholder='Generated automatically from the label'
                        />
                        <p
                          id={`field-name-${field.id}-help`}
                          className='text-sm text-muted-foreground'
                        >
                          Generated automatically from the field label.
                        </p>
                        {fieldErrors.name ? (
                          <p
                            id={`field-name-${field.id}-error`}
                            className='text-sm text-destructive'
                          >
                            {fieldErrors.name}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label>Field Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) =>
                            updateCustomField(field.id, {
                              type: value as CustomField["type"],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='text'>Text</SelectItem>
                            <SelectItem value='email'>Email</SelectItem>
                            <SelectItem value='phone'>Phone</SelectItem>
                            <SelectItem value='number'>Number</SelectItem>
                            <SelectItem value='textarea'>Text Area</SelectItem>
                            <SelectItem value='select'>
                              Dropdown Select
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='flex items-center space-x-2 pt-8'>
                        <Checkbox
                          id={`required-${field.id}`}
                          checked={field.required}
                          onCheckedChange={(checked) =>
                            updateCustomField(field.id, {
                              required: Boolean(checked),
                            })
                          }
                        />
                        <label
                          htmlFor={`required-${field.id}`}
                          className='text-sm font-medium leading-none'
                        >
                          Required field
                        </label>
                      </div>
                    </div>

                    {field.type === "select" && (
                      <div className='space-y-2'>
                        <Label>Dropdown Options</Label>
                        {(field.options || []).map((option, optionIndex) => (
                          <div key={optionIndex} className='flex gap-2'>
                            <Input
                              value={option}
                              onChange={(event) =>
                                updateFieldOption(
                                  field.id,
                                  optionIndex,
                                  event.target.value
                                )
                              }
                              aria-invalid={!!fieldErrors.options}
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                            <Button
                              type='button'
                              variant='outline'
                              size='icon'
                              onClick={() =>
                                removeFieldOption(field.id, optionIndex)
                              }
                            >
                              <X className='h-4 w-4' />
                            </Button>
                          </div>
                        ))}
                        {fieldErrors.options ? (
                          <p className='text-sm text-destructive'>
                            {fieldErrors.options}
                          </p>
                        ) : null}
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => addFieldOption(field.id)}
                          className='w-full'
                        >
                          <Plus className='mr-2 h-4 w-4' />
                          Add Option
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Button
            type='button'
            variant='outline'
            onClick={addCustomField}
            className='w-full bg-transparent'
          >
            <Plus className='mr-2 h-4 w-4' />
            Add Custom Field
          </Button>
        </CardContent>
      </Card>

      <div className='flex justify-end gap-3'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit'>Save Event</Button>
      </div>
    </form>
  );
}
