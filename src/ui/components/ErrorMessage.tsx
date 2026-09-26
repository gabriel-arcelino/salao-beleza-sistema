import { FONT_BODY, FONT_SIZE_BODY } from "../tokens/typography";
import { SPACING_MD, SPACING_SM } from "../tokens/spacing";
import { COLOR_PRIMARY } from "../tokens/colors";
import { Button } from "./Button";

interface ErrorMessageProps {
  message?: string;
  // Opcional de propósito: sem a prop, o componente renderiza exatamente como antes.
  onRetry?: () => void;
}

export function ErrorMessage({ message = "Erro", onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        fontFamily: FONT_BODY,
        fontSize: FONT_SIZE_BODY,
        padding: SPACING_MD,
        color: COLOR_PRIMARY,
      }}
    >
      {message}
      {onRetry && (
        <div style={{ marginTop: SPACING_SM }}>
          <Button onClick={onRetry}>Tentar novamente</Button>
        </div>
      )}
    </div>
  );
}
