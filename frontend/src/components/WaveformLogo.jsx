export default function WaveformLogo({ className = "", label = "Signal AI" }) {
	return (
		<span className={`waveform-logo ${className}`} role="img" aria-label={label}>
			<span /><span /><span /><span /><span />
		</span>
	);
}