import { SPACING_MD } from "../tokens/spacing";
import { COLOR_SECONDARY } from "../tokens/colors";

interface CardProps {
  children: React.ReactNode;
}

export function Card({ children }: CardProps) {
  return (
    <div
      data-testid="card"
      style={{
        border: `1px solid ${COLOR_SECONDARY}`,
        borderRadius: 8,
        padding: SPACING_MD,
      }}
    >
      {children}
    </div>
  );
}
