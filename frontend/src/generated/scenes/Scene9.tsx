import React from 'react';
import { interpolate, Easing } from 'remotion';
import { SceneLayout } from '../../components/SceneLayout';
import { PALETTE } from '../Palette';

type Point = { x: number; y: number };

const triangleSide = 300;
const triangleHeight = (triangleSide * Math.sqrt(3)) / 2;
const centerX = 300;
const centerY = 200;

const vertices: Point[] = [
	{ x: centerX, y: centerY - triangleHeight / 2 }, // top
	{ x: centerX - triangleSide / 2, y: centerY + triangleHeight / 2 }, // bottom left
	{ x: centerX + triangleSide / 2, y: centerY + triangleHeight / 2 }, // bottom right
];

const getPointOnTriangle = (t: number): Point => {
	const total = triangleSide * 3;
	const distance = t * total;
	const segment = Math.floor(distance / triangleSide);
	const local = (distance % triangleSide) / triangleSide;

	const start = vertices[segment];
	const end = vertices[(segment + 1) % 3];

	return {
		x: start.x + (end.x - start.x) * local,
		y: start.y + (end.y - start.y) * local,
	};
};

const MyDiagram: React.FC<{ progress: number }> = ({ progress }) => {
	// Opacity for entrance
	const opacity = interpolate(progress, [0, 0.2], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	// Pointer moves around triangle from 0 to 1
	const pointerPos = getPointOnTriangle(progress);

	return (
		<div
			style={{
				position: 'relative',
				width: 600,
				height: 400,
				opacity,
			}}
		>
			{/* Triangle lines */}
			<svg
				width={600}
				height={400}
				style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
			>
				{vertices.map((v, i) => {
					const next = vertices[(i + 1) % vertices.length];
					return (
						<line
							key={i}
							x1={v.x}
							y1={v.y}
							x2={next.x}
							y2={next.y}
							stroke={PALETTE.primary}
							strokeWidth={3}
							strokeOpacity={opacity}
						/>
					);
				})}
			</svg>

			{/* Overlapping circles (Venn style) */}
			{[
				{ color: PALETTE.primary, offsetX: -30, offsetY: -30 },
				{ color: PALETTE.secondary, offsetX: 30, offsetY: -30 },
				{ color: PALETTE.muted, offsetX: 0, offsetY: 30 },
			].map((c, idx) => (
				<div
					key={idx}
					style={{
						position: 'absolute',
						left: centerX - 120 + c.offsetX,
						top: centerY - 120 + c.offsetY,
						width: 240,
						height: 240,
						borderRadius: '50%',
						backgroundColor: c.color,
						opacity: 0.3 * opacity,
						mixBlendMode: 'screen',
					}}
				/>
			))}

			{/* Vertex labels */}
			{[
				{ label: 'Consistency', pos: vertices[0] },
				{ label: 'Availability', pos: vertices[1] },
				{ label: 'Partition Tolerance', pos: vertices[2] },
			].map((item, idx) => (
				<div
					key={idx}
					style={{
						position: 'absolute',
						left: item.pos.x - 60,
						top: item.pos.y - 30,
						color: PALETTE.text,
						fontFamily: 'Inter, sans-serif',
						fontSize: 18,
						fontWeight: 600,
						opacity,
						pointerEvents: 'none',
					}}
				>
					{item.label}
				</div>
			))}

			{/* Moving pointer (small arrow) */}
			<div
				style={{
					position: 'absolute',
					left: pointerPos.x - 6,
					top: pointerPos.y - 6,
					width: 12,
					height: 12,
					backgroundColor: PALETTE.highlight,
					borderRadius: '50%',
					boxShadow: `0 0 12px ${PALETTE.highlight}`,
					opacity,
				}}
			/>
		</div>
	);
};

export default function Scene() {
	const title = 'Trade‑offs: Latency, Consistency, Availability, and Cost';
	const subtitle = '';
	const bullets = ['Latency', 'Consistency', 'Availability', 'Cost'];

	return (
		<SceneLayout
			title={title}
			subtitle={subtitle}
			bullets={bullets}
			renderDiagram={(progress) => <MyDiagram progress={progress} />}
			mode="split"
		/>
	);
}