import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, className = "", required, ...props }: LabelProps) {
  return (
    <label className={`mb-2 block text-small font-medium text-text ${className}`} {...props}>
      {children}
      {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
    </label>
  );
}

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    FieldProps {
  leadingIcon?: ReactNode;
}

const fieldClasses =
  "w-full rounded-md bg-surface-2 text-text placeholder:text-faint outline-none ring-1 ring-border transition focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", error, hint, id, label, leadingIcon, required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div>
      {label && <Label htmlFor={inputId} required={required}>{label}</Label>}
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-faint" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={`min-h-11 px-4 py-2 ${leadingIcon ? "pl-12" : ""} ${fieldClasses} ${error ? "ring-danger focus:ring-danger" : ""} ${className}`}
          {...props}
        />
      </div>
      {(error || hint) && (
        <p id={messageId} className={`mt-2 text-small ${error ? "text-danger" : "text-muted"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = "", error, hint, id, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;

  return (
    <div>
      {label && <Label htmlFor={textareaId} required={required}>{label}</Label>}
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`min-h-[100px] resize-y px-4 py-3 ${fieldClasses} ${error ? "ring-danger focus:ring-danger" : ""} ${className}`}
        {...props}
      />
      {(error || hint) && (
        <p id={messageId} className={`mt-2 text-small ${error ? "text-danger" : "text-muted"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
