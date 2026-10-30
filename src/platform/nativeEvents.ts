// Keep real DOM events for Formik and existing controlled-field handlers.
export function changeNativeValue(
  control: HTMLInputElement | HTMLSelectElement,
  value: string,
) {
  const prototype =
    control instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
    control,
    value,
  );
  control.dispatchEvent(
    new Event(control instanceof HTMLSelectElement ? "change" : "input", {
      bubbles: true,
    }),
  );
}
export function blurNativeControl(control: HTMLSelectElement) {
  control.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
}

export function isFirstInvalid(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): boolean {
  if (!control.form) return true;
  return (
    Array.from(control.form.elements).find(
      (element) =>
        (element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement) &&
        element.willValidate &&
        !element.validity.valid,
    ) === control
  );
}
