import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { COLOR_PRIMARY, COLOR_SECONDARY, COLOR_TEXT } from "../tokens/colors";
import { FONT_BODY, FONT_SIZE_BODY } from "../tokens/typography";
import { SPACING_MD, SPACING_SM } from "../tokens/spacing";

type ButtonVariant = "primary" | "neutral" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: COLOR_PRIMARY,
    color: "#ffffff",
    border: `1px solid ${COLOR_PRIMARY}`,
    fontWeight: 700,
  },
  neutral: {
    backgroundColor: "#ffffff",
    color: COLOR_TEXT,
    border: `1px solid ${COLOR_SECONDARY}`,
    fontWeight: 400,
  },
  destructive: {
    backgroundColor: "#ffffff",
    color: COLOR_PRIMARY,
    border: `1px solid ${COLOR_PRIMARY}`,
    fontWeight: 600,
  },
};

export function Button({
  variant = "neutral",
  type = "button",
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      data-variant={variant}
      disabled={disabled}
      style={{
        fontFamily: FONT_BODY,
        fontSize: FONT_SIZE_BODY,
        padding: `${SPACING_SM}px ${SPACING_MD}px`,
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    />
  );
}
