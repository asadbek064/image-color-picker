import { colorDistance, rgbToHex } from './colorUtils.js';

/**
 * Extract dominant colors from an image using k-means clustering
 * @param img - HTMLImageElement to extract colors from
 * @param numColors - Number of colors to extract
 * @param canvas - Canvas element to use for image processing
 * @param ctx - Canvas 2D context
 * @returns Array of hex color strings
 */
export function extractColors(
	img: HTMLImageElement,
	numColors: number,
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D
): string[] {
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	ctx.drawImage(img, 0, 0);

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const pixels: number[][] = [];

	// Sample pixels (every 5th pixel for performance)
	for (let i = 0; i < imageData.data.length; i += 20) {
		pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
	}

	const dominantColors = kMeans(pixels, numColors);
	return dominantColors.map((color) => rgbToHex(color[0], color[1], color[2]));
}

/**
 * K-means clustering algorithm for color quantization
 * @param pixels - Array of RGB pixel values
 * @param k - Number of clusters
 * @param maxIterations - Maximum number of iterations
 * @returns Array of k dominant colors as [r, g, b]
 */
function kMeans(pixels: number[][], k: number, maxIterations: number = 10): number[][] {
	// Initialize centroids randomly
	let centroids: number[][] = [];
	const used = new Set<string>();

	while (centroids.length < k) {
		const idx = Math.floor(Math.random() * pixels.length);
		const key = pixels[idx].join(',');
		if (!used.has(key)) {
			centroids.push([...pixels[idx]]);
			used.add(key);
		}
	}

	for (let iter = 0; iter < maxIterations; iter++) {
		const clusters: number[][][] = Array(k)
			.fill(null)
			.map(() => []);

		// Assign pixels to nearest centroid
		for (const pixel of pixels) {
			let minDist = Infinity;
			let closestIdx = 0;

			for (let i = 0; i < k; i++) {
				const dist = colorDistance(pixel, centroids[i]);
				if (dist < minDist) {
					minDist = dist;
					closestIdx = i;
				}
			}

			clusters[closestIdx].push(pixel);
		}

		// Update centroids
		const newCentroids = clusters.map((cluster, idx) => {
			if (cluster.length === 0) return centroids[idx];

			const sum = cluster.reduce(
				(acc, pixel) => {
					return [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]];
				},
				[0, 0, 0]
			);

			return [
				Math.round(sum[0] / cluster.length),
				Math.round(sum[1] / cluster.length),
				Math.round(sum[2] / cluster.length)
			];
		});

		centroids = newCentroids;
	}

	// Sort by cluster size
	const clusterSizes = Array(k).fill(0);
	for (const pixel of pixels) {
		let minDist = Infinity;
		let closestIdx = 0;
		for (let i = 0; i < k; i++) {
			const dist = colorDistance(pixel, centroids[i]);
			if (dist < minDist) {
				minDist = dist;
				closestIdx = i;
			}
		}
		clusterSizes[closestIdx]++;
	}

	return centroids
		.map((color, idx) => ({ color, size: clusterSizes[idx] }))
		.sort((a, b) => b.size - a.size)
		.map((item) => item.color);
}
