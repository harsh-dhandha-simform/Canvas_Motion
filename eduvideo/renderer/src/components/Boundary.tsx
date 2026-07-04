// A labeled bounding box used by the architecture diagram layout to visually group
// components (e.g. "API layer", "Data layer").
import { Rect, RectProps, Txt } from "@revideo/2d";
import { DesignTokens } from "../styles/designSystem";

export function Boundary(tokens: DesignTokens, label: string, props: RectProps = {}) {
  return (
    <Rect
      fill={null}
      stroke={tokens.colors.diagramEdge}
      lineWidth={2}
      radius={tokens.radius.md}
      lineDash={[10, 8]}
      {...props}
    >
      <Txt
        text={label}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.7}
        fontWeight={tokens.font.weightBold}
        fill={tokens.colors.textMuted}
        offsetX={-1}
        offsetY={-1}
        position={[
          -((props.width as number) ?? 0) / 2 + 16,
          -((props.height as number) ?? 0) / 2 + 12,
        ]}
      />
    </Rect>
  );
}
