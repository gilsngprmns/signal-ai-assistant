const barHeights = [46, 28, 54, 38, 76, 112, 64, 34, 22, 42, 82, 48, 96, 58, 30, 20, 37, 68, 44, 104, 54, 32, 24, 50, 78, 40, 60, 26, 90, 48, 34, 70, 30, 52, 22, 42];

export default function EqualizerArtwork() {
	return (
		<div className="login-equalizer" aria-hidden="true">
			{barHeights.map((height, barIndex) => (
				<span
					key={barIndex}
					style={{ "--bar-height": `${height}px`, "--bar-index": barIndex }}
				/>
			))}
		</div>
	);
}