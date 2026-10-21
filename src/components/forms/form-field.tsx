import type { ReactNode } from "react";

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="field-error" id={id} role="alert">{message}</p> : null;
}

export function FormField({ id, label, required, error, children }: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return <div className="form-field">
    <label htmlFor={id}>{label}{required && <span className="required" aria-hidden="true"> *</span>}</label>
    {children}
    <FieldError id={`${id}-error`} message={error} />
  </div>;
}
