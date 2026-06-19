import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
	Easing,
} from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';
import { ScalingArrow } from '../../components/ScalingArrow';
import { GlassPanel } from '../../components/GlassPanel';
import { GlowingNode } from '../../components/GlowingNode';

const CacheDiagram: React.FC<{ progress: number }> = ({ progress }) => {
	const containerW = 800;
	const containerH = 400;

	// Core positions
	const appPos = { x: 120, y: 200 };
	const cachePos = { x: 400, y: 200 };
	const dbPos = { x: 680, y: 200 };

	// Shard offsets
	const shardOffsets = [
		{ x: -80, y: -40 },
		{ x: 80, y: -40 },
	];

	// Helper to compute absolute shard position
	const shardPos = (i: number) => ({
		x: cachePos.x + shardOffsets[i].x,
		y: cachePos.y + shardOffsets[i].y,
	});

	// Opacity based on overall progress
	const baseOpacity = progress;

	// Arrow progress (draw after nodes appear)
	const arrowProgress = Math.max(0, progress - 0.2) / 0.8;

	// Hash ring tick marks
	const tickCount = 16;
	const tickMarks = Array.from({ length: tickCount }).map((_, i) => {
		const angle = (i / tickCount) * Math.PI * 2;
		const innerR = 110;
		const outerR = 120;
		const x1 = cachePos.x + Math.cos(angle) * innerR;
		const y1 = cachePos.y + Math.sin(angle) * innerR;
		const x2 = cachePos.x + Math.cos(angle) * outerR;
		const y2 = cachePos.y + Math.sin(angle) * outerR;
		return (
			<line
				key={i}
				x1={x1}
				y1={y1}
				x2={x2}
				y2={y2}
				stroke={PALETTE.muted}
				strokeWidth={2}
				opacity={baseOpacity}
			/>
		);
	});

	return (
		<div
			style={{
				position: 'relative',
				width: containerW,
				height: containerH,
				margin: 'auto',
			}}
		>
			{/* Hash ring */}
			<svg
				style={{
					position: 'absolute',
					inset: 0,
				}}
			>
				<circle
					cx={cachePos.x}
					cy={cachePos.y}
					r={120}
					stroke={PALETTE.secondary}
					strokeWidth={2}
					fill="none"
					opacity={baseOpacity}
				/>
				{tickMarks}
			</svg>

			{/* Application box */}
			<GlassPanel
				style={{
					position: 'absolute',
					left: appPos.x - 80,
					top: appPos.y - 30,
					width: 160,
					height: 60,
					opacity: baseOpacity,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: PALETTE.text,
					fontFamily: 'Inter, sans-serif',
					fontSize: 18,
				}}
			>
				Application
			</GlassPanel>

			{/* Cache box (transparent background) */}
			<GlassPanel
				style={{
					position: 'absolute',
					left: cachePos.x - 100,
					top: cachePos.y - 100,
					width: 200,
					height: 200,
					opacity: baseOpacity,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: PALETTE.text,
					fontFamily: 'Inter, sans-serif',
					fontSize: 18,
				}}
			>
				Cache Layer
			</GlassPanel>

			{/* Database cylinder */}
			<div
				style={{
					position: 'absolute',
					left: dbPos.x - 60,
					top: dbPos.y - 40,
					width: 120,
					height: 80,
					backgroundColor: PALETTE.codeBg,
					borderRadius: '50% / 20%',
					opacity: baseOpacity,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: PALETTE.text,
					fontFamily: 'Inter, sans-serif',
					fontSize: 18,
				}}
			>
				Database
			</div>

			{/* Shard circles */}
			{shardOffsets.map((_, i) => {
				const pos = shardPos(i);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: pos.x - 48,
							top: pos.y - 48,
							width: 96,
							height: 96,
							borderRadius: '50%',
							backgroundColor: PALETTE.secondary,
							opacity: baseOpacity,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: PALETTE.text,
							fontFamily: 'Inter, sans-serif',
							fontSize: 14,
						}}
					>
						Shard {i + 1}
					</div>
				);
			})}

			{/* Arrows from Application to shards */}
			{shardOffsets.map((_, i) => {
				const to = shardPos(i);
				return (
					<ScalingArrow
						key={`app-to-${i}`}
						from={appPos}
						to={to}
						color={PALETTE.primary}
						progress={arrowProgress}
						arrowHeadSize={8}
						style={{ opacity: baseOpacity }}
					/>
				);
			})}

			{/* Hit arrows (green) back to Application */}
			{shardOffsets.map((_, i) => {
				const from = shardPos(i);
				return (
					<ScalingArrow
						key={`hit-${i}`}
						from={from}
						to={appPos}
						color={PALETTE.success}
						progress={arrowProgress}
						arrowHeadSize={8}
						style={{ opacity: baseOpacity }}
					/>
				);
			})}

			{/* Miss arrows (red) to Database */}
			{shardOffsets.map((_, i) => {
				const from = shardPos(i);
				return (
					<ScalingArrow
						key={`miss-${i}`}
						from={from}
						to={dbPos}
						color={PALETTE.danger}
						progress={arrowProgress}
						arrowHeadSize={8}
						style={{ opacity: baseOpacity }}
					/>
				);
			})}

			{/* TTL badge near Database */}
			<div
				style={{
					position: 'absolute',
					left: dbPos.x + 40,
					top: dbPos.y - 60,
					padding: '4px 8px',
					backgroundColor: PALETTE.highlight,
					borderRadius: 4,
					color: PALETTE.background,
					fontFamily: 'Inter, sans-serif',
					fontSize: 12,
					opacity: baseOpacity,
				}}
			>
				TTL
			</div>
		</div>
	);
};

export default function Scene() {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const sceneDuration = 450; // as per storyboard
	const progress = interpolate(frame, [0, sceneDuration], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<SceneLayout
			title="Caching Strategies for Read‑Heavy Ticket Queries"
			subtitle="Optimizing read paths with multi‑layer cache"
			bullets={['Caching', 'Cache Invalidation', 'Consistency']}
			codeSnippet={`cache = create_cache('seat_availability')\n# store data in cache\n# set TTL or LRU policy`}
			renderDiagram={(p) => <CacheDiagram progress={p} />}
			// mode defaults to "split"
		/>
	);
}