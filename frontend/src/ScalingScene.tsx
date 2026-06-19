import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const COLORS = {
  bg: "#f6f8fb",
  ink: "#14213d",
  muted: "#5d6b82",
  vertical: "#2563eb",
  verticalSoft: "#dbeafe",
  horizontal: "#059669",
  horizontalSoft: "#dcfce7",
  amber: "#f59e0b",
  red: "#dc2626",
  line: "#cbd5e1",
  panel: "#ffffff",
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const softEase = Easing.bezier(0.16, 1, 0.3, 1);

const fade = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    ...clamp,
    easing: softEase,
  });

const pop = (frame: number, start: number, fps: number) =>
  spring({
    frame: frame - start,
    fps,
    config: {
      damping: 16,
      stiffness: 90,
      mass: 0.7,
    },
  });

const sceneTitle: React.CSSProperties = {
  position: "absolute",
  top: 54,
  left: 88,
  right: 88,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const eyebrow: React.CSSProperties = {
  fontSize: 24,
  letterSpacing: 0,
  color: COLORS.muted,
  fontWeight: 700,
  textTransform: "uppercase",
};

const h1: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 66,
  lineHeight: 1,
  letterSpacing: 0,
  color: COLORS.ink,
  fontWeight: 850,
};

const timeBadge: React.CSSProperties = {
  padding: "18px 24px",
  border: `2px solid ${COLORS.line}`,
  borderRadius: 8,
  background: COLORS.panel,
  color: COLORS.ink,
  fontSize: 24,
  fontWeight: 800,
};

const panelBase: React.CSSProperties = {
  position: "absolute",
  top: 190,
  width: 820,
  height: 690,
  borderRadius: 8,
  background: COLORS.panel,
  border: `2px solid ${COLORS.line}`,
  overflow: "hidden",
};

const panelHeader: React.CSSProperties = {
  height: 88,
  padding: "22px 32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: `2px solid ${COLORS.line}`,
};

const panelName: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 850,
  color: COLORS.ink,
};

const panelSub: React.CSSProperties = {
  fontSize: 21,
  color: COLORS.muted,
  fontWeight: 700,
};

const smallLabel: React.CSSProperties = {
  fontSize: 21,
  color: COLORS.muted,
  fontWeight: 800,
};

const Metric: React.FC<{
  label: string;
  value: string;
  color: string;
  progress: number;
}> = ({ label, value, color, progress }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 21,
          color: COLORS.ink,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div
        style={{
          height: 12,
          borderRadius: 6,
          background: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(8, progress * 100)}%`,
            background: color,
            borderRadius: 6,
          }}
        />
      </div>
    </div>
  );
};

const RequestDots: React.FC<{
  frame: number;
  color: string;
  count: number;
  left: number;
  top: number;
  spread?: number;
}> = ({ frame, color, count, left, top, spread = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const cycle = ((frame * 4 + index * 34) % 220) / 220;
        const y = top + cycle * 380;
        const x = left + Math.sin(cycle * Math.PI * 2 + index) * 22 * spread;
        const opacity = interpolate(cycle, [0, 0.12, 0.88, 1], [0, 1, 1, 0]);

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 16,
              height: 16,
              borderRadius: 8,
              background: color,
              opacity,
              boxShadow: `0 0 22px ${color}`,
            }}
          />
        );
      })}
    </>
  );
};

const ServerBox: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  detail: string;
  color: string;
  opacity?: number;
  failed?: boolean;
  scale?: number;
}> = ({ x, y, w, h, title, detail, color, opacity = 1, failed, scale = 1 }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center bottom",
        borderRadius: 8,
        border: `4px solid ${failed ? COLORS.red : color}`,
        background: failed ? "#fee2e2" : "#ffffff",
        boxShadow: `0 18px 36px rgba(15, 23, 42, ${failed ? 0.08 : 0.12})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: w - 42,
          height: 14,
          borderRadius: 4,
          background: failed ? COLORS.red : color,
          marginBottom: 18,
        }}
      />
      <div
        style={{
          color: failed ? COLORS.red : COLORS.ink,
          fontSize: failed ? 28 : 30,
          fontWeight: 850,
          lineHeight: 1,
        }}
      >
        {failed ? "OFFLINE" : title}
      </div>
      <div
        style={{
          color: COLORS.muted,
          fontSize: 21,
          fontWeight: 800,
          marginTop: 12,
        }}
      >
        {failed ? "traffic rerouted" : detail}
      </div>
    </div>
  );
};

const StatusChip: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => {
  return (
    <div
      style={{
        height: 46,
        borderRadius: 8,
        border: `2px solid ${color}`,
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        color: COLORS.ink,
        fontSize: 17,
        fontWeight: 850,
        overflow: "hidden",
      }}
    >
      <span style={{ color: COLORS.muted }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
};

const Arrow: React.FC<{
  x: number;
  y: number;
  width: number;
  rotate?: number;
  color: string;
  opacity?: number;
}> = ({ x, y, width, rotate = 0, color, opacity = 1 }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height: 4,
        opacity,
        background: color,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "left center",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -2,
          top: -8,
          width: 0,
          height: 0,
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          borderLeft: `16px solid ${color}`,
        }}
      />
    </div>
  );
};

const VerticalPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const growth = interpolate(frame, [60, 150], [0, 1], {
    ...clamp,
    easing: softEase,
  });
  const limit = fade(frame, 172, 205);
  const outage = fade(frame, 235, 265);
  const cpu = Math.round(interpolate(growth, [0, 1], [4, 32]));
  const ram = Math.round(interpolate(growth, [0, 1], [8, 128]));
  const serverScale = interpolate(growth, [0, 1], [0.86, 1.24]);
  const shake =
    outage > 0 ? Math.sin(frame * 0.85) * interpolate(outage, [0, 1], [0, 8]) : 0;

  return (
    <div style={{ ...panelBase, left: 88 }}>
      <div style={{ ...panelHeader, background: COLORS.verticalSoft }}>
        <div>
          <div style={panelName}>Vertical Scaling</div>
          <div style={panelSub}>bigger single machine</div>
        </div>
        <div style={{ ...smallLabel, color: COLORS.vertical }}>Scale up</div>
      </div>

      <RequestDots
        frame={frame}
        color={COLORS.vertical}
        count={growth > 0.5 ? 9 : 5}
        left={404}
        top={120}
      />
      <Arrow x={410} y={166} width={2} rotate={90} color={COLORS.vertical} />
      <ServerBox
        x={274 + shake}
        y={254}
        w={270}
        h={210}
        title="App Server"
        detail={`${cpu} CPU / ${ram} GB`}
        color={COLORS.vertical}
        scale={serverScale}
      />
      <div
        style={{
          position: "absolute",
          left: 602,
          top: 184,
          width: 42,
          height: 380,
          opacity: limit,
          background:
            "repeating-linear-gradient(45deg, #f59e0b, #f59e0b 14px, #fde68a 14px, #fde68a 28px)",
          borderRadius: 8,
          border: `3px solid ${COLORS.amber}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 550,
          top: 142,
          width: 142,
          textAlign: "center",
          fontSize: 22,
          fontWeight: 850,
          color: COLORS.amber,
          opacity: limit,
        }}
      >
        hardware ceiling
      </div>
      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          bottom: 40,
          opacity: fade(frame, 42, 70),
        }}
      >
        <Metric
          label="capacity"
          value={`${cpu} CPU`}
          color={COLORS.vertical}
          progress={interpolate(growth, [0, 1], [0.18, 0.82])}
        />
        <Metric
          label="memory"
          value={`${ram} GB RAM`}
          color={COLORS.vertical}
          progress={interpolate(growth, [0, 1], [0.12, 0.9])}
        />
        <Metric
          label="failure blast radius"
          value={outage > 0.4 ? "entire app down" : "one server"}
          color={outage > 0.4 ? COLORS.red : COLORS.amber}
          progress={outage > 0.4 ? 1 : 0.72}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 236,
          top: 238,
          width: 350,
          height: 242,
          borderRadius: 8,
          background: "rgba(220, 38, 38, 0.9)",
          opacity: outage,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 42,
          fontWeight: 900,
          transform: `scale(${pop(frame, 238, fps)})`,
        }}
      >
        SINGLE POINT OF FAILURE
      </div>
    </div>
  );
};

const HorizontalPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const addTwo = fade(frame, 100, 132);
  const addThree = fade(frame, 132, 166);
  const fail = fade(frame, 230, 260);
  const dbPressure = fade(frame, 182, 218);
  const requestCount = frame > 150 ? 11 : 6;

  return (
    <div style={{ ...panelBase, right: 88 }}>
      <div style={{ ...panelHeader, background: COLORS.horizontalSoft }}>
        <div>
          <div style={panelName}>Horizontal Scaling</div>
          <div style={panelSub}>more machines behind a balancer</div>
        </div>
        <div style={{ ...smallLabel, color: COLORS.horizontal }}>Scale out</div>
      </div>

      <RequestDots
        frame={frame}
        color={COLORS.horizontal}
        count={requestCount}
        left={404}
        top={118}
        spread={1.4}
      />
      <div
        style={{
          position: "absolute",
          left: 280,
          top: 178,
          width: 260,
          height: 76,
          borderRadius: 8,
          border: `4px solid ${COLORS.horizontal}`,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.ink,
          fontSize: 28,
          fontWeight: 850,
          boxShadow: "0 14px 28px rgba(15, 23, 42, 0.12)",
        }}
      >
        Load Balancer
      </div>
      <Arrow x={410} y={130} width={54} rotate={90} color={COLORS.horizontal} />
      <Arrow x={410} y={256} width={146} rotate={114} color={COLORS.horizontal} />
      <Arrow x={410} y={256} width={130} rotate={90} color={COLORS.horizontal} />
      <Arrow x={410} y={256} width={146} rotate={66} color={COLORS.horizontal} />
      <ServerBox
        x={88}
        y={392}
        w={190}
        h={150}
        title="Server 1"
        detail="healthy"
        color={COLORS.horizontal}
      />
      <ServerBox
        x={316}
        y={392}
        w={190}
        h={150}
        title="Server 2"
        detail="healthy"
        color={COLORS.horizontal}
        opacity={addTwo}
        failed={fail > 0.55}
      />
      <ServerBox
        x={544}
        y={392}
        w={190}
        h={150}
        title="Server 3"
        detail="healthy"
        color={COLORS.horizontal}
        opacity={addThree}
      />
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 564,
          width: 522,
          height: 58,
          borderRadius: 8,
          border: `4px solid ${dbPressure > 0.5 ? COLORS.amber : COLORS.line}`,
          background: dbPressure > 0.5 ? "#fffbeb" : "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          color: COLORS.ink,
          fontSize: 25,
          fontWeight: 850,
        }}
      >
        <span>Shared Database</span>
        <span
          style={{
            color: dbPressure > 0.5 ? COLORS.amber : COLORS.muted,
            fontSize: 21,
          }}
        >
          {dbPressure > 0.5 ? "bottleneck" : "writes"}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          top: 640,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
        }}
      >
        <StatusChip
          label="capacity"
          value={addThree > 0.7 ? "3 nodes" : addTwo > 0.7 ? "2 nodes" : "1 node"}
          color={COLORS.horizontal}
        />
        <StatusChip
          label="resilience"
          value={fail > 0.55 ? "survives node loss" : "redundant"}
          color={COLORS.horizontal}
        />
        <StatusChip
          label="complexity"
          value={dbPressure > 0.5 ? "sessions + DB" : "balancer"}
          color={dbPressure > 0.5 ? COLORS.amber : COLORS.horizontal}
        />
      </div>
    </div>
  );
};

const BottomTimeline: React.FC = () => {
  const frame = useCurrentFrame();
  const steps = [
    { label: "traffic grows", at: 35 },
    { label: "scale decision", at: 85 },
    { label: "limits appear", at: 170 },
    { label: "failure mode", at: 232 },
    { label: "tradeoff", at: 295 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: 88,
        right: 88,
        bottom: 42,
        height: 72,
        display: "flex",
        alignItems: "center",
        gap: 18,
      }}
    >
      {steps.map((step, index) => {
        const active = frame >= step.at;
        return (
          <div
            key={step.label}
            style={{
              flex: 1,
              height: 54,
              borderRadius: 8,
              border: `2px solid ${active ? COLORS.ink : COLORS.line}`,
              background: active ? COLORS.ink : COLORS.panel,
              color: active ? "#fff" : COLORS.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 21,
              fontWeight: 850,
              opacity: fade(frame, 8 + index * 10, 28 + index * 10),
            }}
          >
            {step.label}
          </div>
        );
      })}
    </div>
  );
};

const FinalTakeaway: React.FC = () => {
  const frame = useCurrentFrame();
  const show = fade(frame, 292, 325);

  return (
    <AbsoluteFill
      style={{
        background: `rgba(246, 248, 251, ${show * 0.96})`,
        opacity: show,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 1440,
          height: 560,
          borderRadius: 8,
          background: COLORS.panel,
          border: `2px solid ${COLORS.line}`,
          padding: "64px 78px",
          boxShadow: "0 32px 80px rgba(15, 23, 42, 0.16)",
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 850,
            color: COLORS.muted,
            marginBottom: 24,
          }}
        >
          Production scaling tradeoff
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 58,
                lineHeight: 1,
                fontWeight: 900,
                color: COLORS.vertical,
              }}
            >
              Vertical
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 35,
                lineHeight: 1.32,
                color: COLORS.ink,
                fontWeight: 800,
              }}
            >
              Bigger machine. Simple to operate. Fast first fix. Eventually hits
              a hardware ceiling and keeps one large blast radius.
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 58,
                lineHeight: 1,
                fontWeight: 900,
                color: COLORS.horizontal,
              }}
            >
              Horizontal
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 35,
                lineHeight: 1.32,
                color: COLORS.ink,
                fontWeight: 800,
              }}
            >
              More machines. More scalable and resilient. Brings load balancing,
              shared sessions, database pressure, and distributed failure modes.
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 54,
            height: 6,
            borderRadius: 3,
            background:
              "linear-gradient(90deg, #2563eb 0%, #f59e0b 50%, #059669 100%)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const ScalingScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={sceneTitle}>
        <div>
          <div style={eyebrow}>Architectural scaling</div>
          <h1 style={h1}>Operational reality, not just bigger vs more</h1>
        </div>
        <div style={timeBadge}>
          {frame < 90
            ? "100 users/day"
            : frame < 180
              ? "10,000 users/day"
              : frame < 270
                ? "failure drills"
                : "final frame"}
        </div>
      </div>

      <VerticalPanel />
      <HorizontalPanel />
      <BottomTimeline />
      <FinalTakeaway />
    </AbsoluteFill>
  );
};
