import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

/**
 * Magpie text field: `input.words` (7px radius, accent focus ring).
 * CIS: Settings / add-provider / Library editor string fields.
 */
export const WordsField = forwardRef<HTMLInputElement, Props>(function WordsField(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`words${className ? ` ${className}` : ""}`}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});
