function splitLongSegment(segment, maxSize) {
	const sentences = segment.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [segment];
	const parts = [];
	let current = "";

	for (const sentence of sentences) {
		const clean = sentence.trim();
		if (clean.length > maxSize) {
			if (current) parts.push(current);
			current = "";
			let remainder = clean;
			while (remainder.length > maxSize) {
				let boundary = remainder.lastIndexOf(" ", maxSize);
				if (boundary < Math.floor(maxSize * 0.6)) boundary = maxSize;
				parts.push(remainder.slice(0, boundary).trim());
				remainder = remainder.slice(boundary).trim();
			}
			current = remainder;
		} else if (!current) {
			current = clean;
		} else if ((current.length + clean.length + 1) <= maxSize) {
			current += ` ${clean}`;
		} else {
			parts.push(current);
			current = clean;
		}
	}
	if (current) parts.push(current);
	return parts;
}

export default function chunkText(text, { maxSize = 1000, overlap = 200 } = {}) {
	if (typeof text !== "string" || !text.trim()) return [];
	if (overlap < 0 || maxSize <= overlap) {
		throw new RangeError("maxSize must be greater than a non-negative overlap");
	}

	const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
	const segments = paragraphs.flatMap((paragraph) =>
		paragraph.length > maxSize ? splitLongSegment(paragraph, maxSize) : [paragraph]
	);
	const chunks = [];
	let current = "";

	for (const segment of segments) {
		if (!current) {
			current = segment;
		} else if (current.length + segment.length + 2 <= maxSize) {
			current += `\n\n${segment}`;
		} else {
			chunks.push(current);
			const tail = current.slice(-overlap);
			const wordBoundary = tail.indexOf(" ");
			current = `${wordBoundary >= 0 ? tail.slice(wordBoundary + 1) : tail} ${segment}`.trim();
			if (current.length > maxSize) {
				const parts = splitLongSegment(current, maxSize);
				current = parts.pop() ?? "";
				chunks.push(...parts);
			}
		}
	}
	if (current) chunks.push(current);
	return chunks.map((content, index) => ({ index, content, pageNumber: null }));
}
