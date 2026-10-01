"use client";

import { useState } from "react";

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
    <form onSubmit={handleSubmit} noValidate className="board-post-form">
      <div className="form-field">
        <label htmlFor="board-title" className="form-label">
          Title <span className="form-required">*</span>
        </label>
        <input
          id="board-title"
          name="title"
          type="text"
          className={`form-input${fieldErrors.title ? " form-input-error" : ""}`}
          value={form.title}
          onChange={handleChange}
          placeholder="e.g. Centrifuge needed for biochemistry lab"
          disabled={isSubmitting}
        />
        {fieldErrors.title && <p className="form-error">{fieldErrors.title}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="board-category" className="form-label">
          Category <span className="form-required">*</span>
        </label>
        <input
          id="board-category"
          name="category"
          type="text"
          className={`form-input${fieldErrors.category ? " form-input-error" : ""}`}
          value={form.category}
          onChange={handleChange}
          placeholder="e.g. Centrifuges, Microscopes, PCR Equipment"
          disabled={isSubmitting}
        />
        {fieldErrors.category && <p className="form-error">{fieldErrors.category}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="board-description" className="form-label">
          Description <span className="form-required">*</span>
        </label>
        <textarea
          id="board-description"
          name="description"
          className={`form-input form-textarea${fieldErrors.description ? " form-input-error" : ""}`}
          value={form.description}
          onChange={handleChange}
          placeholder="Describe the equipment you need, including any specifications or requirements."
          rows={4}
          disabled={isSubmitting}
        />
        {fieldErrors.description && <p className="form-error">{fieldErrors.description}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="board-intended-use" className="form-label">
          Intended Use <span className="form-required">*</span>
        </label>
        <textarea
          id="board-intended-use"
          name="intended_use"
          className={`form-input form-textarea${fieldErrors.intended_use ? " form-input-error" : ""}`}
          value={form.intended_use}
          onChange={handleChange}
          placeholder="How will this equipment be used? What research or program will benefit?"
          rows={3}
          disabled={isSubmitting}
        />
        {fieldErrors.intended_use && <p className="form-error">{fieldErrors.intended_use}</p>}
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="board-quantity" className="form-label">
            Quantity Needed <span className="form-required">*</span>
          </label>
          <input
            id="board-quantity"
            name="quantity_needed"
            type="number"
            min={1}
            step={1}
            className={`form-input${fieldErrors.quantity_needed ? " form-input-error" : ""}`}
            value={form.quantity_needed}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          {fieldErrors.quantity_needed && (
            <p className="form-error">{fieldErrors.quantity_needed}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="board-needed-by" className="form-label">
            Needed By <span className="form-required">*</span>
          </label>
          <input
            id="board-needed-by"
            name="needed_by"
            type="date"
            className={`form-input${fieldErrors.needed_by ? " form-input-error" : ""}`}
            value={form.needed_by}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          {fieldErrors.needed_by && <p className="form-error">{fieldErrors.needed_by}</p>}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="board-location" className="form-label">
          Location <span className="form-required">*</span>
        </label>
        <input
          id="board-location"
          name="location"
          type="text"
          className={`form-input${fieldErrors.location ? " form-input-error" : ""}`}
          value={form.location}
          onChange={handleChange}
          placeholder="e.g. Boston, MA"
          disabled={isSubmitting}
        />
        {fieldErrors.location && <p className="form-error">{fieldErrors.location}</p>}
      </div>

      {submitError && <p className="form-error form-submit-error">{submitError}</p>}

      <div className="form-actions">
        <button
          type="submit"
          className="button button-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting…" : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
