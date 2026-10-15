import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

/**
 * Magpie text field: `input.words` (7px radius, accent focus ring).
 * CIS: Settings / add-provider string fields — not native `<select>` chrome or one-off inputs.
 */
export function WordsField({ invalid, className, ...rest }: Props) {
  return (
    <input
      className={`words${className ? ` ${className}` : ""}`}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
