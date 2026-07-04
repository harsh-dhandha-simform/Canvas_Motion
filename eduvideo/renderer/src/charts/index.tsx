// ChartScene rendering — simple bar/line charts via primitive Rect/Line drawing
// (per phase guardrail: no charting library needed for Big-O/benchmark comparisons).
import { Line, Node as RNode, Rect, Txt } from "@revideo/2d";
import { createRef, sequence, ThreadGenerator, waitFor } from "@revideo/core";
import { DesignTokens } from "../styles/designSystem";
import { ChartProps } from "../types";

const SERIES_COLORS = ["#22c55e", "#f97316", "#8b5cf6", "#0ea5e9", "#ef4444"];

export function* renderChart(
  container: RNode,
  tokens: DesignTokens,
  props: ChartProps,
  width: number,
  height: number,
  duration: number,
): ThreadGenerator {
  const marginLeft = 90;
  const marginBottom = 100;
  const marginTop = 50;
  const marginRight = 30;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const originX = -width / 2 + marginLeft;
  const originY = height / 2 - marginBottom;

  const maxValue = Math.max(1, ...props.series.flatMap((s) => s.data));
  const pointCount = Math.max(...props.series.map((s) => s.data.length), 1);

  container.add(
    <Line
      points={[
        [originX, originY - plotHeight],
        [originX, originY],
        [originX + plotWidth, originY],
      ]}
      stroke={tokens.colors.diagramEdge}
      lineWidth={2}
    />,
  );

  if (props.yLabel) {
    container.add(
      <Txt
        text={props.yLabel}
        rotation={-90}
        position={[originX - 60, originY - plotHeight / 2]}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.7}
        fill={tokens.colors.textMuted}
      />,
    );
  }
  if (props.xLabel) {
    container.add(
      <Txt
        text={props.xLabel}
        position={[originX + plotWidth / 2, originY + 35]}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.7}
        fill={tokens.colors.textMuted}
      />,
    );
  }
  if (props.caption) {
    container.add(
      <Txt
        text={props.caption}
        position={[0, height / 2 - 10]}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.65}
        fill={tokens.colors.textMuted}
      />,
    );
  }

  props.series.forEach((s, i) => {
    const color = SERIES_COLORS[i % SERIES_COLORS.length];
    const legendX = originX + i * 180;
    container.add(<Rect position={[legendX, originY - plotHeight - 25]} width={16} height={16} fill={color} radius={3} />);
    container.add(
      <Txt
        text={s.name}
        position={[legendX + 65, originY - plotHeight - 25]}
        fontFamily={tokens.font.family}
        fontSize={tokens.font.sizeSM * 0.6}
        fill={tokens.colors.text}
      />,
    );
  });

  const revealTasks: ThreadGenerator[] = [];

  if (props.chartType === "bar") {
    const groupWidth = plotWidth / pointCount;
    const barWidth = groupWidth / (props.series.length + 1);
    props.series.forEach((s, si) => {
      const color = SERIES_COLORS[si % SERIES_COLORS.length];
      s.data.forEach((value, i) => {
        const targetHeight = (value / maxValue) * plotHeight;
        const x = originX + groupWidth * i + barWidth * (si + 1);
        const ref = createRef<Rect>();
        container.add(
          <Rect ref={ref} position={[x, originY]} offsetY={1} width={barWidth * 0.8} height={0} fill={color} radius={4} />,
        );
        revealTasks.push(ref().height(targetHeight, 0.5));
      });
    });
  } else {
    props.series.forEach((s, si) => {
      const color = SERIES_COLORS[si % SERIES_COLORS.length];
      const points = s.data.map((value, i) => [
        originX + (pointCount > 1 ? (plotWidth * i) / (pointCount - 1) : 0),
        originY - (value / maxValue) * plotHeight,
      ]) as [number, number][];
      const ref = createRef<Line>();
      container.add(<Line ref={ref} points={points} stroke={color} lineWidth={4} end={0} />);
      revealTasks.push(ref().end(1, 0.8));
    });
  }

  yield* sequence(0.2, ...revealTasks);
  const revealTime = 0.2 * Math.max(revealTasks.length - 1, 0) + 0.8;
  const remaining = duration - revealTime;
  if (remaining > 0) yield* waitFor(remaining);
}
