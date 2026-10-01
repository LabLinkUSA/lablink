"use client";

import { useState } from "react";

import styles from "@/components/recipient-dashboard.module.css";
import { Button, Field, FieldGrid, Input, Notice, Textarea } from "@/components/ui";
import { createRequestBoardPost } from "@/lib/api-client";
import type { RequestBoardPostCreate } from "@/lib/types";

type FieldName = keyof RequestBoardPostCreate;
type FieldErrors = Partial<Record<FieldName, string>>;

function buildEmptyForm(): RequestBoardPostCreate {
  return {
    title: "",
    category: "",
    description: "",
    needed_by: "",
    quantity_needed: 1,
    location: "",
    intended_use: "",
  };
}

function validateForm(form: RequestBoardPostCreate): FieldErrors {
  const errors: FieldErrors = {};
  const requiredText: Array<[FieldName, string]> = [
    ["title", "Title"],
    ["category", "Category"],
    ["description", "Description"],
    ["needed_by", "Needed by date"],
    ["location", "Location"],
    ["intended_use", "Intended use"],
  ];

  for (const [key, label] of requiredText) {
    const value = form[key];
    if (typeof value === "string" && value.trim().length === 0) {
      errors[key] = `${label} is required.`;
    }
  }

  if (!Number.isInteger(form.quantity_needed) || form.quantity_needed < 1) {
    errors.quantity_needed = "Quantity must be a whole number greater than zero.";
  }

  return errors;
}

export function RequestBoardForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<RequestBoardPostCreate>(buildEmptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value, 10) || 1 : value,
    }));
    if (fieldErrors[name as FieldName]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await createRequestBoardPost(form);
    setIsSubmitting(false);

    if (!result) {
      setSubmitError("Failed to submit your request. Please try again.");
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      <FieldGrid>
        <Field label="Title" htmlFor="board-title" error={fieldErrors.title} required span="full">
          <Input
            id="board-title"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Centrifuge needed for biochemistry lab"
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Category" htmlFor="board-category" error={fieldErrors.category} required span="full">
          <Input
            id="board-category"
            name="category"
            type="text"
            value={form.category}
            onChange={handleChange}
            placeholder="e.g. Centrifuges, Microscopes, PCR Equipment"
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Description" htmlFor="board-description" error={fieldErrors.description} required span="full">
          <Textarea
            id="board-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the equipment you need, including any specifications or requirements."
            rows={4}
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Intended Use" htmlFor="board-intended-use" error={fieldErrors.intended_use} required span="full">
          <Textarea
            id="board-intended-use"
            name="intended_use"
            value={form.intended_use}
            onChange={handleChange}
            placeholder="How will this equipment be used? What research or program will benefit?"
            rows={3}
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Quantity Needed" htmlFor="board-quantity" error={fieldErrors.quantity_needed} required>
          <Input
            id="board-quantity"
            name="quantity_needed"
            type="number"
            min={1}
            step={1}
            value={form.quantity_needed}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Needed By" htmlFor="board-needed-by" error={fieldErrors.needed_by} required>
          <Input
            id="board-needed-by"
            name="needed_by"
            type="date"
            value={form.needed_by}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </Field>
        <Field label="Location" htmlFor="board-location" error={fieldErrors.location} required span="full">
          <Input
            id="board-location"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. Boston, MA"
            disabled={isSubmitting}
          />
        </Field>
      </FieldGrid>

      {submitError ? <Notice tone="error">{submitError}</Notice> : null}

      <div className={styles.formActions}>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}
