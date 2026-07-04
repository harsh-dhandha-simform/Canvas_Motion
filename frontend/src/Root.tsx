/**
 * Root.tsx — Remotion entry point.
 * 
 * Maps all scripts found in `generated/examples.generated.ts` into individual
 * Remotion `<Composition>`s. This allows previewing and rendering any generated
 * script in the Remotion studio without code changes.
 */
import "./index.css";
import { Composition } from "remotion";
import { DynamicVideo, VideoScriptProps } from "./DynamicVideo";
import { EXAMPLE_SCRIPTS } from "./generated/examples.generated";
import { SortingVisualizer } from "./components/SortingVisualizer";
import { LinearStructure } from "./components/LinearStructure";
import { ArrayAlgorithm } from "./components/ArrayAlgorithm";
import { DPTableVisualizer } from "./components/DPTableVisualizer";
import { GraphTraversal } from "./components/GraphTraversal";
import { RecursionTree } from "./components/RecursionTree";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {Object.entries(EXAMPLE_SCRIPTS).map(([slug, script]) => {
        const totalFrames = script.scenes.reduce(
          (sum, s) => sum + s.duration_frames,
          0
        );
        return (
          <Composition
            key={slug}
            id={slug}
            component={DynamicVideo}
            durationInFrames={totalFrames}
            fps={script.fps}
            width={script.width}
            height={script.height}
            defaultProps={script as VideoScriptProps}
          />
        );
      })}

      <Composition
        id="preview-SortingVisualizer"
        component={SortingVisualizer}
        durationInFrames={30 * 15}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Bubble sort",
          algorithm: "bubble" as const,
          values: [8, 3, 5, 1, 7, 2, 6, 4],
          showComparisonCounter: true,
        }}
      />

      <Composition
        id="preview-LinearStructure"
        component={LinearStructure}
        durationInFrames={30 * 12}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Queue: enqueue / dequeue",
          kind: "queue" as const,
          initial: [1, 2, 3],
          operations: [
            { op: "enqueue" as const, value: 4 },
            { op: "enqueue" as const, value: 5 },
            { op: "dequeue" as const },
            { op: "dequeue" as const },
          ],
          showHeadTail: true,
        }}
      />
      <Composition
        id="preview-ArrayAlgorithm"
        component={ArrayAlgorithm}
        durationInFrames={30 * 10}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Binary search for 23",
          mode: "binary-search" as const,
          values: [3, 7, 11, 15, 19, 23, 27, 31, 35],
          target: 23,
        }}
      />

      <Composition
        id="preview-DPTableVisualizer"
        component={DPTableVisualizer}
        durationInFrames={30 * 15}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Fibonacci DP table",
          rows: 1,
          cols: 8,
          colLabels: ["0", "1", "2", "3", "4", "5", "6", "7"],
          fills: [
            { row: 0, col: 0, value: 0 },
            { row: 0, col: 1, value: 1 },
            { row: 0, col: 2, value: 1, dependsOn: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
            { row: 0, col: 3, value: 2, dependsOn: [{ row: 0, col: 1 }, { row: 0, col: 2 }] },
            { row: 0, col: 4, value: 3, dependsOn: [{ row: 0, col: 2 }, { row: 0, col: 3 }] },
            { row: 0, col: 5, value: 5, dependsOn: [{ row: 0, col: 3 }, { row: 0, col: 4 }] },
            { row: 0, col: 6, value: 8, dependsOn: [{ row: 0, col: 4 }, { row: 0, col: 5 }] },
            { row: 0, col: 7, value: 13, dependsOn: [{ row: 0, col: 5 }, { row: 0, col: 6 }] },
          ],
        }}
      />
      <Composition
        id="preview-GraphTraversal"
        component={GraphTraversal}
        durationInFrames={30 * 18}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Dijkstra from A",
          algorithm: "dijkstra" as const,
          nodes: [
            { id: "A", x: 15, y: 40 },
            { id: "B", x: 40, y: 20 },
            { id: "C", x: 40, y: 65 },
            { id: "D", x: 65, y: 40 },
            { id: "E", x: 85, y: 25 },
            { id: "F", x: 85, y: 60 },
          ],
          edges: [
            { from: "A", to: "B", weight: 4 },
            { from: "A", to: "C", weight: 2 },
            { from: "B", to: "C", weight: 1 },
            { from: "B", to: "D", weight: 5 },
            { from: "C", to: "D", weight: 8 },
            { from: "D", to: "E", weight: 2 },
            { from: "D", to: "F", weight: 6 },
            { from: "E", to: "F", weight: 3 },
          ],
          start: "A",
          showDistanceTable: true,
        }}
      />
      <Composition
        id="preview-RecursionTree"
        component={RecursionTree}
        durationInFrames={30 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "fib(4) with memoisation",
          root: {
            label: "fib(4)",
            returns: 3,
            children: [
              {
                label: "fib(3)",
                returns: 2,
                children: [
                  {
                    label: "fib(2)",
                    returns: 1,
                    children: [
                      { label: "fib(1)", returns: 1 },
                      { label: "fib(0)", returns: 0 },
                    ],
                  },
                  { label: "fib(1)", returns: 1 },
                ],
              },
              { label: "fib(2)", returns: 1 },
            ],
          },
          showReturns: true,
          memoized: ["fib(2)"],
        }}
      />
    </>
  );
};
