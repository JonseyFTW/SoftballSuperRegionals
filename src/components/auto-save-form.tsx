"use client";

import {
  type FocusEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

type ServerAction = (formData: FormData) => Promise<void> | void;

type SaveStatus = "idle" | "saving" | "saved" | "error";

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "number",
  "email",
  "tel",
  "url",
  "password",
  "datetime-local",
  "date",
  "time",
  "month",
  "week",
]);

export function AutoSaveForm({
  action,
  children,
  className,
  autoSave = true,
  resetOnSave = false,
  onSaved,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  autoSave?: boolean;
  resetOnSave?: boolean;
  onSaved?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastValueRef = useRef<Map<HTMLElement, string>>(new Map());
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const runAction = useCallback(
    (formData: FormData) => {
      setStatus("saving");
      startTransition(async () => {
        try {
          await action(formData);
          setStatus("saved");
          onSaved?.();
          if (resetOnSave) {
            formRef.current?.reset();
            lastValueRef.current.clear();
          }
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setStatus("idle"), 1600);
        } catch {
          setStatus("error");
        }
      });
    },
    [action, onSaved, resetOnSave],
  );

  const submit = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    runAction(new FormData(form));
  }, [runAction]);

  const rememberValue = (target: HTMLElement) => {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      lastValueRef.current.set(target, target.value);
    }
  };

  const hasValueChanged = (target: HTMLElement): boolean => {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const previous = lastValueRef.current.get(target);
      return previous !== target.value;
    }
    return true;
  };

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    if (!autoSave) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (isTextLikeField(target)) return;
    submit();
  };

  const handleFocus = (event: FocusEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (!isTextLikeField(target)) return;
    if (!lastValueRef.current.has(target)) rememberValue(target);
  };

  const handleBlur = (event: FocusEvent<HTMLFormElement>) => {
    if (!autoSave) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (!isTextLikeField(target)) return;
    if (!hasValueChanged(target)) return;
    rememberValue(target);
    submit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <form
      ref={formRef}
      action={action}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onSubmit={handleSubmit}
      className={className}
      autoComplete="off"
    >
      {children}
      <SaveIndicator status={status} isPending={isPending} />
    </form>
  );
}

function isTextLikeField(target: HTMLElement): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(target.type);
  }
  return false;
}

function SaveIndicator({ status, isPending }: { status: SaveStatus; isPending: boolean }) {
  const visible = isPending || status === "saved" || status === "error";
  if (!visible) return null;
  const label =
    status === "error"
      ? "Save failed"
      : isPending || status === "saving"
        ? "Saving..."
        : "Saved";
  const tone =
    status === "error"
      ? "save-indicator error"
      : status === "saved" && !isPending
        ? "save-indicator saved"
        : "save-indicator saving";
  return (
    <span className={tone} role="status" aria-live="polite">
      {label}
    </span>
  );
}
