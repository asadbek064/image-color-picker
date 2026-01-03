// Type definition for EyeDropper API
interface EyeDropper {
	open: () => Promise<{ sRGBHex: string }>;
}

interface EyeDropperConstructor {
	new (): EyeDropper;
}

declare global {
	interface Window {
		EyeDropper?: EyeDropperConstructor;
	}
}

/**
 * Check if the browser supports the EyeDropper API
 * @returns true if EyeDropper API is available, false otherwise
 */
export function isEyeDropperSupported(): boolean {
	return typeof window !== 'undefined' && 'EyeDropper' in window;
}

/**
 * Launch the browser's EyeDropper color picker
 * @returns Promise that resolves to a hex color string, or null if cancelled/failed
 */
export async function pickColorWithEyeDropper(): Promise<string | null> {
	// Check if API is available
	if (!isEyeDropperSupported() || !window.EyeDropper) {
		console.warn('EyeDropper API is not supported in this browser');
		return null;
	}

	try {
		const eyeDropper = new window.EyeDropper();
		const result = await eyeDropper.open();

		// Normalize color to uppercase hex format
		const color = result.sRGBHex.toUpperCase();

		// Validate hex format
		if (!/^#[0-9A-F]{6}$/i.test(color)) {
			console.error('Invalid color format received:', color);
			return null;
		}

		return color;
	} catch (error) {
		// User cancelled the color picker (AbortError)
		if (error instanceof Error && error.name === 'AbortError') {
			return null;
		}

		// Other errors (API not available, etc.)
		console.error('EyeDropper error:', error);
		return null;
	}
}
