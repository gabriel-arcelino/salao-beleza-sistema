import { FONT_BODY, FONT_SIZE_BODY } from "../tokens/typography";
import { SPACING_MD } from "../tokens/spacing";
import { COLOR_PRIMARY } from "../tokens/colors";

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = "Nenhum registro encontrado." }: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={message}
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
