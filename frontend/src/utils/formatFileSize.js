export default function formatFileSize(bytes) {
	if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let size = bytes / 1024;
	let unit = 0;
	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}
	return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}
