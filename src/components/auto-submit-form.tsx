"use client";

import type { ComponentProps, FocusEvent, FormEvent } from "react";
import { useRef } from "react";

export function AutoSubmitForm(props: ComponentProps<"form">) {
  const formRef = useRef<HTMLFormElement>(null);

  const submit = () => {
    formRef.current?.requestSubmit();
  };

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    if (submitsOnChange(event.target)) submit();
  };

  const handleBlur = (event: FocusEvent<HTMLFormElement>) => {
    if (submitsOnBlur(event.target)) submit();
  };

  return <form {...props} ref={formRef} onBlur={handleBlur} onChange={handleChange} />;
}

function submitsOnChange(target: EventTarget): boolean {
  return (
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement &&
      (target.type === "checkbox" || target.type === "radio"))
  );
}

function submitsOnBlur(target: EventTarget): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement &&
      target.type !== "hidden" &&
      target.type !== "checkbox" &&
      target.type !== "radio")
  );
}
