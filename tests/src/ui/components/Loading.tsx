import { FONT_BODY, FONT_SIZE_BODY } from "../tokens/typography";
import { SPACING_MD } from "../tokens/spacing";
import { COLOR_PRIMARY } from "../tokens/colors";

interface LoadingProps {
  message?: string;
}

export function Loading({ message = "Carregando..." }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        fontFamily: FONT_BODY,
        fontSize: FONT_SIZE_BODY,
        padding: SPACING_MD,
        color: COLOR_PRIMARY,
      }}
    >
      {message}
    </div>
  );
}
