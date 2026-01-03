/**
 * Convert RGB values to hex color string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string (e.g., "#ff6b6b")
 */
export function rgbToHex(r: number, g: number, b: number): string {
	return (
		'#' +
		[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
	);
}

/**
 * Convert hex color string to RGB object
 * @param hex - Hex color string (e.g., "#ff6b6b")
 * @returns RGB object with r, g, b properties or null if invalid
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			}
		: null;
}

/**
 * Convert RGB to HSL color values
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns HSL string (e.g., "hsl(0, 100%, 71%)")
 */
export function rgbToHsl(r: number, g: number, b: number): string {
	r = r / 255;
	g = g / 255;
	b = b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h: number,
		s: number,
		l = (max + min) / 2;

	if (max === min) {
		h = s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			case b:
				h = ((r - g) / d + 4) / 6;
				break;
			default:
				h = 0;
		}
	}

	return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

/**
 * Calculate the Euclidean distance between two RGB colors
 * @param c1 - First color as [r, g, b]
 * @param c2 - Second color as [r, g, b]
 * @returns Distance between the colors
 */
export function colorDistance(c1: number[], c2: number[]): number {
	return Math.sqrt(
		Math.pow(c1[0] - c2[0], 2) + Math.pow(c1[1] - c2[1], 2) + Math.pow(c1[2] - c2[2], 2)
	);
}
