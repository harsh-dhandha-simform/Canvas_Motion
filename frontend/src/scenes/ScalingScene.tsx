import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, Easing, interpolate } from "remotion";
import { scalingScene } from "../data/scaling-scene";
import { AnimatedTitle } from "../components/AnimatedTitle";
import { ServerRack } from "../components/ServerRack";
import { ScalingArrow } from "../components/ScalingArrow";
import { ComparisonCard } from "../components/ComparisonCard";

export const ScalingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- SEQUENCE TIMING DEFINITIONS (at 30 FPS) ---
  // Sequence 1: Intro Title (0 - 5s, frames 0 - 150)
  // Sequence 2: Vertical Scaling (5 - 20s, frames 150 - 600)
  // Sequence 3: Horizontal Scaling (20 - 35s, frames 600 - 1050)
  // Sequence 4: Side-by-Side Comparison (35 - 50s, frames 1050 - 1500)
  // Sequence 5: Takeaway (50 - 60s, frames 1500 - 1800)

  // 1. SEQUENCE 1: INTRO TITLE (0 - 150)
  const renderSequence1 = () => {
    if (frame < 0 || frame >= 150) return null;
    
    // Smooth opacity fade out at the end of the sequence
    const outOpacity = interpolate(frame, [135, 150], [1, 0], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return (
      <AbsoluteFill
        style={{ opacity: outOpacity }}
        className="flex flex-col items-center justify-center bg-slate-950 p-10"
      >
        <AnimatedTitle
          title={scalingScene.intro.title}
          subtitle={scalingScene.intro.subtitle}
          accentColor="#38BDF8"
        />
      </AbsoluteFill>
    );
  };

  // 2. SEQUENCE 2: VERTICAL SCALING (150 - 600)
  const renderSequence2 = () => {
    if (frame < 150 || frame >= 600) return null;
    const localFrame = frame - 150;

    // Sequence opacities (fade in and fade out)
    const inOpacity = interpolate(localFrame, [0, 20], [0, 1], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const outOpacity = interpolate(localFrame, [430, 450], [1, 0], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Server size grow animation (frames 100 to 180 in local timeline, 8s to 11s)
    const serverScaleProgress = spring({
      frame: localFrame - 100,
      fps,
      config: { damping: 15, stiffness: 60, mass: 1.2 },
    });
    
    // Scale starts at 0.85 and grows to 1.35
    const serverScale = interpolate(serverScaleProgress, [0, 1], [0.85, 1.35]);

    // Resource specs transition alongside the scale
    const isScaled = localFrame >= 140;
    const cpuVal = isScaled ? scalingScene.vertical.finalSpec.cpu : scalingScene.vertical.initialSpec.cpu;
    const ramVal = isScaled ? scalingScene.vertical.finalSpec.ram : scalingScene.vertical.initialSpec.ram;

    // Hardware ceiling alert (slides in from top right, local frame 200)
    const ceilingProgress = spring({
      frame: localFrame - 200,
      fps,
      config: { damping: 18, stiffness: 80 },
    });
    const ceilingTranslateX = interpolate(ceilingProgress, [0, 1], [400, 0]);
    const ceilingOpacity = interpolate(ceilingProgress, [0, 1], [0, 1]);

    // Blast Radius / Single Point of Failure Warning (local frame 300)
    const failureProgress = spring({
      frame: localFrame - 300,
      fps,
      config: { damping: 12, stiffness: 90 },
    });
    const failureScale = interpolate(failureProgress, [0, 1], [0.5, 1]);
    const failureOpacity = interpolate(failureProgress, [0, 1], [0, 1]);

    // Server shaking when failure/alert is on (starting frame 320)
    const shakeAmount = localFrame > 320 && localFrame < 430
      ? Math.sin(localFrame * 0.95) * 5
      : 0;

    // Stagger bullet points entry on the left (local frame 25)
    const bulletVisibleCount = Math.floor((localFrame - 25) / 25);

    return (
      <AbsoluteFill
        style={{ opacity: inOpacity * outOpacity }}
        className="bg-slate-950 p-20 flex flex-row items-center justify-between"
      >
        {/* Left Hand: Explanatory copy */}
        <div className="w-[50%] h-full flex flex-col justify-center items-start z-10">
          <AnimatedTitle
            title={scalingScene.vertical.title}
            subtitle={scalingScene.vertical.subtitle}
            accentColor="#38BDF8"
            align="left"
          />
          <ul className="mt-8 flex flex-col gap-6 w-full max-w-lg">
            {scalingScene.vertical.points.map((point, i) => {
              const showBullet = i <= bulletVisibleCount;
              const bulletFrame = localFrame - 25 - i * 25;
              const opacityVal = showBullet
                ? interpolate(bulletFrame, [0, 15], [0, 1], {
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 0;
              const xVal = showBullet
                ? interpolate(bulletFrame, [0, 15], [-20, 0], {
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : -20;

              return (
                <li
                  key={i}
                  style={{ opacity: opacityVal, transform: `translateX(${xVal}px)` }}
                  className="flex items-start gap-4 text-xl text-slate-300 font-medium leading-relaxed"
                >
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 mt-1 border border-sky-400/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  </div>
                  <span>{point}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right Hand: Visual Metaphor */}
        <div className="w-[50%] h-full flex flex-col items-center justify-center relative">
          {/* Hardware Ceiling Indicator */}
          {localFrame >= 200 && (
            <div
              style={{
                transform: `translateX(${ceilingTranslateX}px)`,
                opacity: ceilingOpacity,
                top: "16%",
                right: "5%",
              }}
              className="absolute z-20 bg-slate-900 border border-yellow-500/40 rounded-xl px-5 py-3.5 flex flex-col items-center gap-1.5 shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
            >
              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest font-mono">
                ⚠️ HARDWARE LIMIT
              </span>
              <span className="text-white text-sm font-extrabold text-center leading-normal">
                Cannot scale past single physical machine
              </span>
              <div className="w-full h-1 bg-yellow-500/20 rounded mt-1 overflow-hidden">
                <div className="w-full h-full bg-yellow-500 animate-pulse" />
              </div>
            </div>
          )}

          {/* Single Point of Failure Overlay */}
          {localFrame >= 300 && (
            <div
              style={{
                transform: `scale(${failureScale})`,
                opacity: failureOpacity,
                bottom: "10%",
                zIndex: 30,
              }}
              className="absolute bg-rose-950/90 border border-rose-500/40 rounded-2xl px-6 py-4 flex flex-col items-center gap-1 shadow-[0_20px_40px_rgba(220,38,38,0.25)] w-80 text-center"
            >
              <span className="text-xs font-black text-rose-400 uppercase tracking-widest font-mono">
                ⚠️ RISK PROFILE
              </span>
              <span className="text-white text-base font-black uppercase tracking-tight mt-1">
                Single Point of Failure
              </span>
              <span className="text-rose-200 text-[11px] leading-relaxed mt-0.5">
                If this single instance crashes, the entire platform goes offline.
              </span>
            </div>
          )}

          {/* Server Rack */}
          <div
            style={{
              transform: `translate3d(${shakeAmount}px, 0px, 0px)`,
            }}
          >
            <ServerRack
              scale={serverScale}
              label={isScaled ? "Enterprise Server" : "Standard Server"}
              cpu={cpuVal}
              ram={ramVal}
              color="#38BDF8"
              isActive={localFrame < 350 || Math.floor(localFrame / 15) % 2 === 0} // Flashes "offline" when failing
            />
          </div>
        </div>
      </AbsoluteFill>
    );
  };

  // 3. SEQUENCE 3: HORIZONTAL SCALING (600 - 1050)
  const renderSequence3 = () => {
    if (frame < 600 || frame >= 1050) return null;
    const localFrame = frame - 600;

    // Sequence transitions
    const inOpacity = interpolate(localFrame, [0, 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const outOpacity = interpolate(localFrame, [430, 450], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Stagger bullet points entry (local frame 25)
    const bulletVisibleCount = Math.floor((localFrame - 25) / 25);

    // Staggered Server Entries (Server 1 is already there, Server 2 at 100, Server 3 at 160, Server 4 at 220)
    const scaleS1 = spring({ frame: localFrame, fps, config: { damping: 14 } });
    const scaleS2 = localFrame >= 100 ? spring({ frame: localFrame - 100, fps, config: { damping: 14 } }) : 0;
    const scaleS3 = localFrame >= 160 ? spring({ frame: localFrame - 160, fps, config: { damping: 14 } }) : 0;
    const scaleS4 = localFrame >= 220 ? spring({ frame: localFrame - 220, fps, config: { damping: 14 } }) : 0;

    // Load balancer entry (springs in at frame 60)
    const loadBalancerScale = localFrame >= 60 ? spring({ frame: localFrame - 60, fps, config: { damping: 12 } }) : 0;

    // Connection Arrow Drawing Progress
    const arrowProgressS1 = localFrame >= 80 ? interpolate(localFrame, [80, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const arrowProgressS2 = localFrame >= 120 ? interpolate(localFrame, [120, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const arrowProgressS3 = localFrame >= 180 ? interpolate(localFrame, [180, 210], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
    const arrowProgressS4 = localFrame >= 240 ? interpolate(localFrame, [240, 270], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

    // Node locations
    const lbPos = { x: 1920 / 2, y: 310 };
    const s1Pos = { x: 264 + 144, y: 680 };
    const s2Pos = { x: 632 + 144, y: 680 };
    const s3Pos = { x: 1000 + 144, y: 680 };
    const s4Pos = { x: 1368 + 144, y: 680 };

    return (
      <AbsoluteFill
        style={{ opacity: inOpacity * outOpacity }}
        className="bg-slate-950 p-20 flex flex-col items-center justify-between"
      >
        {/* Title at Top */}
        <div className="w-full flex justify-between items-start">
          <AnimatedTitle
            title={scalingScene.horizontal.title}
            subtitle={scalingScene.horizontal.subtitle}
            accentColor="#34D399"
            align="left"
          />
          {/* Legend indicator */}
          <div className="bg-emerald-950/80 border border-emerald-500/30 rounded-xl px-4 py-2 mt-4 text-[11px] font-mono text-emerald-400 font-bold tracking-widest uppercase">
            ⚡ ACTIVE POOL
          </div>
        </div>

        {/* Center Canvas with Node Network */}
        <div className="relative w-full h-[60%] my-6 flex items-center justify-center">
          {/* Arrow vectors */}
          {loadBalancerScale > 0.1 && (
            <>
              <ScalingArrow
                from={lbPos}
                to={s1Pos}
                color="#34D399"
                progress={arrowProgressS1}
                animateFlow={arrowProgressS1 > 0.95}
                flowSpeed={3}
              />
              <ScalingArrow
                from={lbPos}
                to={s2Pos}
                color="#34D399"
                progress={arrowProgressS2}
                animateFlow={arrowProgressS2 > 0.95}
                flowSpeed={3.2}
              />
              <ScalingArrow
                from={lbPos}
                to={s3Pos}
                color="#34D399"
                progress={arrowProgressS3}
                animateFlow={arrowProgressS3 > 0.95}
                flowSpeed={2.8}
              />
              <ScalingArrow
                from={lbPos}
                to={s4Pos}
                color="#34D399"
                progress={arrowProgressS4}
                animateFlow={arrowProgressS4 > 0.95}
                flowSpeed={3.4}
              />
            </>
          )}

          {/* Load Balancer Rack */}
          <div
            style={{
              position: "absolute",
              left: lbPos.x - 144,
              top: lbPos.y - 120,
              zIndex: 20,
            }}
          >
            <ServerRack
              scale={loadBalancerScale}
              label={scalingScene.horizontal.loadBalancerLabel}
              isLoadBalancer
              color="#34D399"
            />
          </div>

          {/* Server 1 */}
          <div
            style={{
              position: "absolute",
              left: s1Pos.x - 144,
              top: s1Pos.y - 100,
            }}
          >
            <ServerRack
              scale={scaleS1 * 0.75}
              label={scalingScene.horizontal.serverLabels[0]}
              cpu="4 Cores"
              ram="16 GB"
              color="#34D399"
            />
          </div>

          {/* Server 2 */}
          {localFrame >= 100 && (
            <div
              style={{
                position: "absolute",
                left: s2Pos.x - 144,
                top: s2Pos.y - 100,
              }}
            >
              <ServerRack
                scale={scaleS2 * 0.75}
                label={scalingScene.horizontal.serverLabels[1]}
                cpu="4 Cores"
                ram="16 GB"
                color="#34D399"
              />
            </div>
          )}

          {/* Server 3 */}
          {localFrame >= 160 && (
            <div
              style={{
                position: "absolute",
                left: s3Pos.x - 144,
                top: s3Pos.y - 100,
              }}
            >
              <ServerRack
                scale={scaleS3 * 0.75}
                label={scalingScene.horizontal.serverLabels[2]}
                cpu="4 Cores"
                ram="16 GB"
                color="#34D399"
              />
            </div>
          )}

          {/* Server 4 */}
          {localFrame >= 220 && (
            <div
              style={{
                position: "absolute",
                left: s4Pos.x - 144,
                top: s4Pos.y - 100,
              }}
            >
              <ServerRack
                scale={scaleS4 * 0.75}
                label={scalingScene.horizontal.serverLabels[3]}
                cpu="4 Cores"
                ram="16 GB"
                color="#34D399"
              />
            </div>
          )}
        </div>

        {/* Bullet Points at Bottom */}
        <div className="w-full flex justify-center py-2">
          <div className="flex gap-10 max-w-5xl justify-center">
            {scalingScene.horizontal.points.map((point, i) => {
              const showBullet = i <= bulletVisibleCount;
              const bulletFrame = localFrame - 25 - i * 25;
              const opacityVal = showBullet
                ? interpolate(bulletFrame, [0, 15], [0, 1], {
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 0;
              const yVal = showBullet
                ? interpolate(bulletFrame, [0, 15], [15, 0], {
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : 15;

              return (
                <div
                  key={i}
                  style={{ opacity: opacityVal, transform: `translateY(${yVal}px)` }}
                  className="flex items-center gap-3 text-base text-slate-300 font-medium font-mono"
                >
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-400/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <span>{point}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    );
  };

  // 4. SEQUENCE 4: COMPARATIVE TRADEOFFS (1050 - 1500)
  const renderSequence4 = () => {
    if (frame < 1050 || frame >= 1500) return null;
    const localFrame = frame - 1050;

    // Sequence transitions
    const inOpacity = interpolate(localFrame, [0, 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const outOpacity = interpolate(localFrame, [430, 450], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Left card sliding in from the left (at frame 10)
    const leftCardProgress = spring({
      frame: localFrame - 10,
      fps,
      config: { damping: 15, stiffness: 70 },
    });
    const leftCardTranslateX = interpolate(leftCardProgress, [0, 1], [-200, 0]);
    const leftCardOpacity = interpolate(leftCardProgress, [0, 1], [0, 1]);

    // Right card sliding in from the right (at frame 40)
    const rightCardProgress = localFrame >= 40 ? spring({
      frame: localFrame - 40,
      fps,
      config: { damping: 15, stiffness: 70 },
    }) : 0;
    const rightCardTranslateX = interpolate(rightCardProgress, [0, 1], [200, 0]);
    const rightCardOpacity = interpolate(rightCardProgress, [0, 1], [0, 1]);

    // Stagger list items inside each card (based on local frame thresholds)
    // Left card starts revealing points at local frame 50. Right card starts at local frame 90.
    const leftVisibleCount = Math.floor((localFrame - 50) / 18);
    const rightVisibleCount = Math.floor((localFrame - 90) / 18);

    return (
      <AbsoluteFill
        style={{ opacity: inOpacity * outOpacity }}
        className="bg-slate-950 p-20 flex flex-col justify-between items-center"
      >
        <AnimatedTitle
          title={scalingScene.comparison.title}
          subtitle="Side by Side Analysis"
          accentColor="#EAB308"
        />

        {/* Double Card Container */}
        <div className="flex gap-12 w-full max-w-6xl justify-center items-center flex-1 my-1">
          {/* Vertical Scaling Card */}
          <div
            style={{
              transform: `translateX(${leftCardTranslateX}px)`,
              opacity: leftCardOpacity,
            }}
          >
            <ComparisonCard
              title={scalingScene.comparison.vertical.title}
              pros={scalingScene.comparison.vertical.pros}
              cons={scalingScene.comparison.vertical.cons}
              accentColor="#38BDF8"
              visibleCount={leftVisibleCount}
            />
          </div>

          {/* Horizontal Scaling Card */}
          <div
            style={{
              transform: `translateX(${rightCardTranslateX}px)`,
              opacity: rightCardOpacity,
            }}
          >
            <ComparisonCard
              title={scalingScene.comparison.horizontal.title}
              pros={scalingScene.comparison.horizontal.pros}
              cons={scalingScene.comparison.horizontal.cons}
              accentColor="#34D399"
              visibleCount={rightVisibleCount}
            />
          </div>
        </div>
      </AbsoluteFill>
    );
  };

  // 5. SEQUENCE 5: FINAL TAKEAWAY (1500 - 1800)
  const renderSequence5 = () => {
    if (frame < 1500 || frame >= 1800) return null;
    const localFrame = frame - 1500;

    // Sequence transitions
    const inOpacity = interpolate(localFrame, [0, 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    
    // Final fade out to black at the end of the video
    const outOpacity = interpolate(localFrame, [270, 300], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Animate first term card (Vertical) (local frame 20)
    const term1Progress = spring({
      frame: localFrame - 20,
      fps,
      config: { damping: 15, stiffness: 80 },
    });
    const term1Opacity = interpolate(term1Progress, [0, 1], [0, 1]);
    const term1TranslateY = interpolate(term1Progress, [0, 1], [50, 0]);

    // Animate second term card (Horizontal) (local frame 50)
    const term2Progress = localFrame >= 50 ? spring({
      frame: localFrame - 50,
      fps,
      config: { damping: 15, stiffness: 80 },
    }) : 0;
    const term2Opacity = interpolate(term2Progress, [0, 1], [0, 1]);
    const term2TranslateY = interpolate(term2Progress, [0, 1], [50, 0]);

    // Animate summary box (local frame 100)
    const summaryProgress = localFrame >= 100 ? spring({
      frame: localFrame - 100,
      fps,
      config: { damping: 18, stiffness: 60 },
    }) : 0;
    const summaryOpacity = interpolate(summaryProgress, [0, 1], [0, 1]);
    const summaryScale = interpolate(summaryProgress, [0, 1], [0.9, 1]);

    return (
      <AbsoluteFill
        style={{ opacity: inOpacity * outOpacity }}
        className="bg-slate-950 p-20 flex flex-col justify-between items-center"
      >
        <AnimatedTitle
          title={scalingScene.takeaway.title}
          subtitle="Summary Comparison"
          accentColor="#A855F7"
        />

        {/* Visual summary cards */}
        <div className="flex flex-col items-center gap-10 flex-1 justify-center w-full max-w-3xl">
          <div className="flex gap-8 w-full justify-center">
            {/* Term 1 */}
            <div
              style={{
                opacity: term1Opacity,
                transform: `translateY(${term1TranslateY}px)`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(56,189,248,0.05)",
              }}
              className="bg-slate-900 border-2 border-sky-500/20 px-8 py-5 rounded-2xl w-80 text-center flex flex-col justify-center"
            >
              <span className="text-[10px] font-black tracking-widest text-sky-400 font-mono mb-1 uppercase">
                Scale Up
              </span>
              <span className="text-white font-extrabold text-lg">
                {scalingScene.takeaway.verticalTerm}
              </span>
            </div>

            {/* Term 2 */}
            <div
              style={{
                opacity: term2Opacity,
                transform: `translateY(${term2TranslateY}px)`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(52,211,153,0.05)",
              }}
              className="bg-slate-900 border-2 border-emerald-500/20 px-8 py-5 rounded-2xl w-80 text-center flex flex-col justify-center"
            >
              <span className="text-[10px] font-black tracking-widest text-emerald-400 font-mono mb-1 uppercase">
                Scale Out
              </span>
              <span className="text-white font-extrabold text-lg">
                {scalingScene.takeaway.horizontalTerm}
              </span>
            </div>
          </div>

          {/* Large Summary Statement Box */}
          <div
            style={{
              opacity: summaryOpacity,
              transform: `scale(${summaryScale})`,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(168,85,247,0.1)",
              borderColor: "rgba(168,85,247,0.25)",
            }}
            className="bg-slate-900/90 border-2 p-8 rounded-3xl text-center w-full"
          >
            <p className="text-2xl font-black text-white leading-relaxed max-w-xl mx-auto drop-shadow-md">
              {scalingScene.takeaway.summary}
            </p>
            <div className="w-24 h-1.5 bg-gradient-to-r from-sky-400 via-purple-500 to-emerald-400 mx-auto mt-6 rounded-full" />
          </div>
        </div>
      </AbsoluteFill>
    );
  };

  return (
    <AbsoluteFill className="bg-slate-950 text-white font-sans overflow-hidden">
      {renderSequence1()}
      {renderSequence2()}
      {renderSequence3()}
      {renderSequence4()}
      {renderSequence5()}
    </AbsoluteFill>
  );
};
