import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const MyDiagram: React.FC<{ progress: number }> = ({ progress }) => {
	const containerWidth = 800;
	const containerHeight = 300;
	const timelineWidth = 600;
	const timelineHeight = 8;
	const markerRadius = 12;
	const markerCount = 5;
	const spacing = timelineWidth / (markerCount - 1);
	const timelineLeft = (containerWidth - timelineWidth) / 2;
	const timelineTop = containerHeight / 2 - timelineHeight / 2;

	// Segment progress (0‑1)
	const strongProg = clamp((progress - 0.1) / 0.2, 0, 1);
	const eventualProg = clamp((progress - 0.35) / 0.3, 0, 1);
	const convergeProg = clamp((progress - 0.7) / 0.2, 0, 1);
	const stateBoxProg = clamp((progress - 0.05) / 0.15, 0, 1);

	// Helper to compute marker X
	const markerX = (index: number) => timelineLeft + index * spacing;

	return (
		<div
			style={{
				position: 'relative',
				width: containerWidth,
				height: containerHeight,
				backgroundColor: PALETTE.background,
			}}
		>
			{/* Timeline bar */}
			<div
				style={{
					position: 'absolute',
					left: timelineLeft,
					top: timelineTop,
					width: timelineWidth,
					height: timelineHeight,
					backgroundColor: PALETTE.muted,
					borderRadius: timelineHeight / 2,
				}}
			/>

			{/* Markers */}
			{Array.from({ length: markerCount }).map((_, i) => (
				<div key={i}>
					<div
						style={{
							position: 'absolute',
							left: markerX(i) - markerRadius,
							top: timelineTop + timelineHeight / 2 - markerRadius,
							width: markerRadius * 2,
							height: markerRadius * 2,
							borderRadius: '50%',
							backgroundColor: PALETTE.text,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							left: markerX(i) - 30,
							top: timelineTop + 30,
							color: PALETTE.text,
							fontSize: 14,
							fontFamily: 'Inter, sans-serif',
						}}
					>
						{['Write', 'Read', 'Read', 'Sync', ''][i] ||
							['Write', 'Read', 'Read', 'Sync', ''][i]}
					</div>
				</div>
			))}

			{/* Strong consistency line (solid green) */}
			<div
				style={{
					position: 'absolute',
					left: markerX(0),
					top: timelineTop + timelineHeight / 2 - 2,
					width: spacing * strongProg,
					height: 4,
					backgroundColor: PALETTE.success,
				}}
			/>

			{/* Strong arrowhead */}
			<div
				style={{
					position: 'absolute',
					left: markerX(0) + spacing * strongProg - 6,
					top: timelineTop + timelineHeight / 2 - 6,
					width: 0,
					height: 0,
					borderLeft: '6px solid transparent',
					borderRight: '6px solid transparent',
					borderTop: `12px solid ${PALETTE.success}`,
					opacity: strongProg,
				}}
			/>

			{/* Eventual consistency line (dashed yellow) */}
			<div
				style={{
					position: 'absolute',
					left: markerX(0),
					top: timelineTop + timelineHeight / 2 - 2,
					width: spacing * 2 * eventualProg,
					height: 4,
					borderTop: `4px dashed ${PALETTE.secondary}`,
				}}
			/>

			{/* Eventual arrowhead */}
			<div
				style={{
					position: 'absolute',
					left: markerX(0) + spacing * 2 * eventualProg - 6,
					top: timelineTop + timelineHeight / 2 - 6,
					width: 0,
					height: 0,
					borderLeft: '6px solid transparent',
					borderRight: '6px solid transparent',
					borderTop: `12px solid ${PALETTE.secondary}`,
					opacity: eventualProg,
				}}
			/>

			{/* Converge line (dashed yellow) */}
			<div
				style={{
					position: 'absolute',
					left: markerX(2),
					top: timelineTop + timelineHeight / 2 - 2,
					width: spacing * convergeProg,
					height: 4,
					borderTop: `4px dashed ${PALETTE.secondary}`,
				}}
			/>

			{/* Converge arrowhead */}
			<div
				style={{
					position: 'absolute',
					left: markerX(2) + spacing * convergeProg - 6,
					top: timelineTop + timelineHeight / 2 - 6,
					width: 0,
					height: 0,
					borderLeft: '6px solid transparent',
					borderRight: '6px solid transparent',
					borderTop: `12px solid ${PALETTE.secondary}`,
					opacity: convergeProg,
				}}
			/>

			{/* State machine box */}
			<div
				style={{
					position: 'absolute',
					left: timelineLeft,
					top: timelineTop - 80,
					width: 300,
					padding: 12,
					backgroundColor: PALETTE.codeBg,
					borderRadius: 8,
					boxShadow: `0 0 12px ${PALETTE.highlight}`,
					opacity: stateBoxProg,
				}}
			>
				<div style={{ color: PALETTE.text, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>
					<strong>Strong Consistency</strong>
				</div>
				<div style={{ color: PALETTE.text, fontFamily: 'Inter, sans-serif' }}>
					Pending → Committed
				</div>
				<div style={{ height: 8 }} />
				<div style={{ color: PALETTE.text, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>
					<strong>Eventual Consistency</strong>
				</div>
				<div style={{ color: PALETTE.text, fontFamily: 'Inter, sans-serif' }}>
					Pending → Stale → Committed
				</div>
			</div>
		</div>
	);
};

export default function Scene() {
	const frame = useCurrentFrame();
	const fps = 30;
	const totalFrames = 150; // 5 seconds
	const progress = interpolate(frame, [0, totalFrames], [0, 1], {
		extrapolateRight: 'clamp',
		easing: Easing.bezier(0.45, 0, 0.55, 1),
	});

	return (
		<SceneLayout
			title="Eventual Consistency vs Strong Consistency in Seat Availability"
			subtitle="Understanding latency and data integrity trade‑offs"
			bullets={['Eventual Consistency', 'Strong Consistency', 'Data Integrity']}
			renderDiagram={(p) => <MyDiagram progress={p * progress} />}
		/>
	);
}