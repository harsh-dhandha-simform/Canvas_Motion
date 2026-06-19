import React from 'react';
import {
	useCurrentFrame,
	interpolate,
	Easing,
	useVideoConfig,
} from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';
import { GlowingNode } from '../../components/GlowingNode';

const DIAGRAM_WIDTH = 800;
const DIAGRAM_HEIGHT = 600;

// Positions for diagram elements
const nodes = [
	{ id: 'A', x: 80, y: 120, label: 'Node A' },
	{ id: 'B', x: 80, y: 260, label: 'Node B' },
	{ id: 'C', x: 80, y: 400, label: 'Node C' },
];
const box = { x: 300, y: 250, width: 200, height: 80 };
const versionNumber = 'v=5';

type MyDiagramProps = { progress: number };
const MyDiagram: React.FC<MyDiagramProps> = ({ progress }) => {
	// Helper to compute dash offset for line drawing animation
	const lineDash = (p: number) => {
		const length = 200; // rough max length
		const dash = length * (1 - p);
		return `${dash} ${length}`;
	};

	// Opacity helpers
	const nodeOpacity = interpolate(progress, [0, 0.1], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const arrowsOpacity = interpolate(progress, [0.2, 0.3], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const successOpacity = interpolate(progress, [0.6, 0.65], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const conflictOpacity = interpolate(progress, [0.8, 0.85], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	return (
		<div
			style={{
				position: 'relative',
				width: DIAGRAM_WIDTH,
				height: DIAGRAM_HEIGHT,
			}}
		>
			{/* SVG for arrows */}
			<svg
				width={DIAGRAM_WIDTH}
				height={DIAGRAM_HEIGHT}
				style={{ position: 'absolute', inset: 0 }}
			>
				{/* Arrows from nodes to box */}
				{nodes.map((node) => (
					<line
						key={node.id}
						x1={node.x + 48}
						y1={node.y}
						x2={box.x}
						y2={box.y + box.height / 2}
						stroke={PALETTE.secondary}
						strokeWidth={2}
						opacity={arrowsOpacity}
						strokeDasharray={lineDash(progress)}
					/>
				))}

				{/* Success arrow (green) from box back to Node B */}
				<line
					x1={box.x + box.width}
					y1={box.y + box.height / 2}
					x2={nodes[1].x - 48}
					y2={nodes[1].y}
					stroke={PALETTE.success}
					strokeWidth={3}
					opacity={successOpacity}
					markerEnd="url(#arrowHeadGreen)"
				/>

				{/* Conflict arrow (red) from box back to Node C */}
				<line
					x1={box.x + box.width}
					y1={box.y + box.height / 2}
					x2={nodes[2].x - 48}
					y2={nodes[2].y}
					stroke={PALETTE.danger}
					strokeWidth={3}
					opacity={conflictOpacity}
					markerEnd="url(#arrowHeadRed)"
				/>

				{/* Arrowheads definitions */}
				<defs>
					<marker
						id="arrowHeadGreen"
						markerWidth="10"
						markerHeight="10"
						refX="0"
						refY="3"
						orient="auto"
						markerUnits="strokeWidth"
					>
						<path d="M0,0 L0,6 L9,3 z" fill={PALETTE.success} />
					</marker>
					<marker
						id="arrowHeadRed"
						markerWidth="10"
						markerHeight="10"
						refX="0"
						refY="3"
						orient="auto"
						markerUnits="strokeWidth"
					>
						<path d="M0,0 L0,6 L9,3 z" fill={PALETTE.danger} />
					</marker>
				</defs>
			</svg>

			{/* Client nodes */}
			{nodes.map((node) => (
				<div
					key={node.id}
					style={{
						position: 'absolute',
						left: node.x - 48,
						top: node.y - 48,
						opacity: nodeOpacity,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 4,
					}}
				>
					<GlowingNode
						size={96}
						color={PALETTE.primary}
						pulsing={true}
						style={{}}
					/>
					<div
						style={{
							color: PALETTE.text,
							fontFamily: 'Inter, sans-serif',
							fontSize: 14,
						}}
					>
						{node.label}
					</div>
				</div>
			))}

			{/* Inventory record box */}
			<div
				style={{
					position: 'absolute',
					left: box.x,
					top: box.y,
					width: box.width,
					height: box.height,
					backgroundColor: '#2a2e3d',
					borderRadius: 8,
					border: `2px solid ${PALETTE.muted}`,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					opacity: arrowsOpacity,
				}}
			>
				<div
					style={{
						color: PALETTE.text,
						fontFamily: 'Inter, sans-serif',
						fontSize: 18,
						marginBottom: 4,
					}}
				>
					Seat 123
				</div>
				<div
					style={{
						color: PALETTE.highlight,
						fontFamily: 'Inter, sans-serif',
						fontSize: 16,
					}}
				>
					{versionNumber}
				</div>
			</div>

			{/* Expected version bubbles */}
			{nodes.map((node, idx) => (
				<div
					key={node.id + '-bubble'}
					style={{
						position: 'absolute',
						left: node.x - 30,
						top: box.y + box.height / 2 - 60,
						padding: '4px 8px',
						backgroundColor: PALETTE.primary,
						color: PALETTE.text,
						borderRadius: 6,
						fontSize: 12,
						fontFamily: 'Inter, sans-serif',
						opacity: arrowsOpacity,
					}}
				>
					expected_version={5 - idx}
				</div>
			))}
		</div>
	);
};

export default function Scene() {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const totalFrames = 630; // duration from brief
	const progress = interpolate(frame, [0, totalFrames], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const title = 'Optimistic Concurrency Control';
	const subtitle = 'Inventory Management via Optimistic Concurrency';
	const bullets = [
		'Optimistic Concurrency',
		'Version Numbers',
		'Timestamps',
	];
	const codeSnippet = `version = get_version('seat_123')
if version == expected_version:
    # update seat allocation
    update_version('seat_123', version + 1)`;

	return (
		<SceneLayout
			title={title}
			subtitle={subtitle}
			bullets={bullets}
			codeSnippet={codeSnippet}
			renderDiagram={(p) => <MyDiagram progress={p * progress} />}
			mode="split"
		/>
	);
}