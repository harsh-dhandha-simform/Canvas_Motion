import { useEffect, useRef, useState, useMemo } from "react";

export interface ContainerScale {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  scale: number;
  overflow: boolean;
}

export function useContainerScale(
  refCanvasW = 1920,
  refCanvasH = 1080,
  minScaleFloor = 0.25
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: refCanvasW, height: refCanvasH });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Use ResizeObserver to dynamically update scale
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const scaleState = useMemo(() => {
    const { width, height } = dimensions;
    const scaleX = width / refCanvasW;
    const scaleY = height / refCanvasH;
    const scale = Math.min(scaleX, scaleY);
    const overflow = scale < minScaleFloor;

    return {
      width,
      height,
      scaleX,
      scaleY,
      scale,
      overflow,
    };
  }, [dimensions, refCanvasW, refCanvasH, minScaleFloor]);

  return {
    ref: containerRef,
    ...scaleState,
  };
}
