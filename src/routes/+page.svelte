<script>
// @ts-nocheck

	import { onMount } from 'svelte';
	import { isEyeDropperSupported, pickColorWithEyeDropper } from '$lib/utils/eyeDropperUtils';
	import { hexToRgb, rgbToHex, rgbToHsl } from '$lib/utils/colorUtils';
	import { extractColors } from '$lib/utils/colorExtraction';

	// State
	let paletteCount = 5;
	let selectedColor = '#FF6B6B';
	/**
	 * @type {string | ArrayBuffer | null}
	 */
	let uploadedImageSrc = null;
	let isDragging = false;

	let colorValues = {
		hex: '#FF6B6B',
		rgb: 'rgb(255, 107, 107)',
		hsl: 'hsl(0, 100%, 71%)'
	};

	let paletteColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

	// Pixel picker state
	let isPickerActive = false;
	let pickerX = 0;
	let pickerY = 0;
	/**
	 * @type {string | null}
	 */
	let hoveredPixelColor = null;

	// EyeDropper support
	let eyeDropperSupported = false;

	// Elements
	/**
	 * @type {HTMLInputElement}
	 */
	let fileInput;
	/**
	 * @type {HTMLCanvasElement}
	 */
	let canvas;
	/**
	 * @type {CanvasRenderingContext2D | null}
	 */
	let ctx;
	/**
	 * @type {HTMLImageElement}
	 */
	let imagePreview;
	/**
	 * @type {HTMLCanvasElement}
	 */
	let zoomCanvas;
	/**
	 * @type {CanvasRenderingContext2D | null}
	 */
	let zoomCtx;

	onMount(() => {
		if (canvas) {
			ctx = canvas.getContext('2d');
		}
		eyeDropperSupported = isEyeDropperSupported();
	});

	// Reactive statement to initialize zoom canvas context when it becomes available
	$: if (zoomCanvas && !zoomCtx) {
		zoomCtx = zoomCanvas.getContext('2d');
	}

	function decreasePalette() {
		if (paletteCount > 3) {
			paletteCount--;
			if (uploadedImageSrc && imagePreview) {
				handleExtractColors(imagePreview, paletteCount);
			}
		}
	}

	function increasePalette() {
		if (paletteCount < 10) {
			paletteCount++;
			if (uploadedImageSrc && imagePreview) {
				handleExtractColors(imagePreview, paletteCount);
			}
		}
	}

	function downloadPalette() {
		console.log('Download palette');
	}

	function savePalette() {
		console.log('Save palette');
	}

	function copyToClipboard(value) {
		navigator.clipboard.writeText(value).then(() => {
			console.log('Copied:', value);
		});
	}

	function useOwnImage() {
		fileInput?.click();
	}

	async function pickFromScreen() {
		const color = await pickColorWithEyeDropper();
		if (color) {
			// Clear the uploaded image
			uploadedImageSrc = null;

			// Set palette to only show the picked color
			paletteColors = [color];
			paletteCount = 1;

			// Select the picked color
			selectColor(color);
		}
	}

	// File handling
	/**
	 * @param {{ target: { files: any[]; }; }} event
	 */
	function handleFileSelect(event) {
		const file = event.target.files?.[0];
		if (file && file.type.startsWith('image/')) {
			processImage(file);
		}
	}

	/**
	 * @param {{ preventDefault: () => void; }} event
	 */
	function handleDragOver(event) {
		event.preventDefault();
		isDragging = true;
	}

	/**
	 * @param {{ preventDefault: () => void; }} event
	 */
	function handleDragLeave(event) {
		event.preventDefault();
		isDragging = false;
	}

	/**
	 * @param {{ preventDefault: () => void; dataTransfer: { files: any[]; }; }} event
	 */
	function handleDrop(event) {
		event.preventDefault();
		isDragging = false;

		const file = event.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('image/')) {
			processImage(file);
		}
	}

	function processImage(file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			uploadedImageSrc = e.target.result;

			// Wait for image to load in the DOM
			setTimeout(() => {
				if (imagePreview) {
					handleExtractColors(imagePreview, paletteCount);
				}
			}, 100);
		};
		reader.readAsDataURL(file);
	}

	// Color extraction wrapper
	function handleExtractColors(img, numColors) {
		if (!canvas || !ctx) return;

		paletteColors = extractColors(img, numColors, canvas, ctx);

		// Update selected color to the most dominant
		if (paletteColors.length > 0) {
			selectedColor = paletteColors[0];
			updateSelectedColorVariants(selectedColor);
		}
	}

	function updateSelectedColorVariants(hex) {
		const rgb = hexToRgb(hex);
		if (!rgb) return;

		// Update color values
		colorValues.hex = hex;
		colorValues.rgb = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
		colorValues.hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
	}

	function selectColor(color) {
		selectedColor = color;
		updateSelectedColorVariants(color);
	}

	// Pixel picker functions
	function handleImageMouseMove(event) {
		if (!uploadedImageSrc || !imagePreview || !canvas || !ctx) return;

		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Convert display coordinates to image coordinates, accounting for object-fit: contain
		const imgWidth = imagePreview.naturalWidth;
		const imgHeight = imagePreview.naturalHeight;
		const imgAspect = imgWidth / imgHeight;
		const containerAspect = rect.width / rect.height;

		let renderWidth, renderHeight, offsetX, offsetY;

		if (imgAspect > containerAspect) {
			// Image is wider - width fills container, height has letterboxing
			renderWidth = rect.width;
			renderHeight = renderWidth / imgAspect;
			offsetX = 0;
			offsetY = (rect.height - renderHeight) / 2;
		} else {
			// Image is taller - height fills container, width has letterboxing
			renderHeight = rect.height;
			renderWidth = imgAspect * renderHeight;
			offsetX = (rect.width - renderWidth) / 2;
			offsetY = 0;
		}

		const scaleX = imgWidth / renderWidth;
		const scaleY = imgHeight / renderHeight;
		const imageX = Math.floor((x - offsetX) * scaleX);
		const imageY = Math.floor((y - offsetY) * scaleY);

		// Check if coordinates are within image bounds
		if (imageX < 0 || imageX >= canvas.width || imageY < 0 || imageY >= canvas.height) {
			isPickerActive = false;
			hoveredPixelColor = null;
			return;
		}

		// Get pixel color at cursor position
		const pixelData = ctx.getImageData(imageX, imageY, 1, 1).data;
		hoveredPixelColor = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);

		// Update picker position
		pickerX = x;
		pickerY = y;
		isPickerActive = true;

		// Draw zoomed view
		drawZoomView(imageX, imageY);
	}

	function handleImageMouseLeave() {
		isPickerActive = false;
		hoveredPixelColor = null;
	}

	function handleImageClick(event) {
		if (!hoveredPixelColor) return;
		selectColor(hoveredPixelColor);
	}

	/**
	 * @param {number} centerX
	 * @param {number} centerY
	 */
	function drawZoomView(centerX, centerY) {
		if (!zoomCanvas || !canvas || !ctx) {
			return;
		}

		// Ensure context is initialized
		if (!zoomCtx) {
			zoomCtx = zoomCanvas.getContext('2d', { imageSmoothingEnabled: false });
			if (!zoomCtx) return;
		}

		const zoomSize = 150; // Size of zoom canvas (matches CSS size to prevent blur)
		const gridSize = 15; // Number of pixels to show (15x15 grid)
		const pixelSize = zoomSize / gridSize; // Size of each pixel in the zoom view (10px)
		const halfGrid = Math.floor(gridSize / 2);

		zoomCanvas.width = zoomSize;
		zoomCanvas.height = zoomSize;

		// Disable image smoothing for crisp pixels
		zoomCtx.imageSmoothingEnabled = false;

		// Clear zoom canvas
		zoomCtx.clearRect(0, 0, zoomSize, zoomSize);

		// Draw magnified pixels
		for (let dy = -halfGrid; dy <= halfGrid; dy++) {
			for (let dx = -halfGrid; dx <= halfGrid; dx++) {
				const srcX = centerX + dx;
				const srcY = centerY + dy;

				// Check bounds
				if (srcX >= 0 && srcX < canvas.width && srcY >= 0 && srcY < canvas.height) {
					const pixel = ctx.getImageData(srcX, srcY, 1, 1).data;
					const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

					const drawX = (dx + halfGrid) * pixelSize;
					const drawY = (dy + halfGrid) * pixelSize;

					zoomCtx.fillStyle = color;
					zoomCtx.fillRect(drawX, drawY, pixelSize, pixelSize);
				}
			}
		}

		// Draw grid lines
		zoomCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
		zoomCtx.lineWidth = 1;

		for (let i = 0; i <= gridSize; i++) {
			// Vertical lines
			zoomCtx.beginPath();
			zoomCtx.moveTo(i * pixelSize, 0);
			zoomCtx.lineTo(i * pixelSize, zoomSize);
			zoomCtx.stroke();

			// Horizontal lines
			zoomCtx.beginPath();
			zoomCtx.moveTo(0, i * pixelSize);
			zoomCtx.lineTo(zoomSize, i * pixelSize);
			zoomCtx.stroke();
		}

		// Draw crosshair at center
		const centerPixelX = halfGrid * pixelSize;
		const centerPixelY = halfGrid * pixelSize;

		zoomCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
		zoomCtx.lineWidth = 1;

		// Vertical crosshair
		zoomCtx.beginPath();
		zoomCtx.moveTo(centerPixelX + pixelSize / 2, 0);
		zoomCtx.lineTo(centerPixelX + pixelSize / 2, zoomSize);
		zoomCtx.stroke();

		// Horizontal crosshair
		zoomCtx.beginPath();
		zoomCtx.moveTo(0, centerPixelY + pixelSize / 2);
		zoomCtx.lineTo(zoomSize, centerPixelY + pixelSize / 2);
		zoomCtx.stroke();

		// Highlight center pixel
		zoomCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
		zoomCtx.lineWidth = 2;
		zoomCtx.strokeRect(centerPixelX, centerPixelY, pixelSize, pixelSize);
	}
</script>

<main>
	<div class="container">
		<div class="card">
			<!-- Hidden file input -->
			<input
				type="file"
				accept="image/*"
				bind:this={fileInput}
				on:change={handleFileSelect}
				style="display: none;"
			/>

			<!-- Hidden canvas for color extraction -->
			<canvas bind:this={canvas} style="display: none;"></canvas>

			<div class="two-column">
				<!-- Left Column -->
				<div class="left-column">
					<!-- Image Preview Panel -->
					<div class="image-section">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="section-label">Image</label>
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="image-preview"
							class:dragging={isDragging}
							on:dragover={handleDragOver}
							on:dragleave={handleDragLeave}
							on:drop={handleDrop}
						>
							{#if uploadedImageSrc}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div class="image-container">
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
									<img
										bind:this={imagePreview}
										src={uploadedImageSrc}
										alt="Uploaded preview"
										class="uploaded-image"
										on:mousemove={handleImageMouseMove}
										on:mouseleave={handleImageMouseLeave}
										on:click={handleImageClick}
									/>
								</div>

								{#if isPickerActive}
									<div class="zoom-loupe" style="left: {pickerX}px; top: {pickerY}px;">
										<canvas bind:this={zoomCanvas} class="zoom-canvas"></canvas>
										{#if hoveredPixelColor}
											<div class="pixel-color-display">
												<div class="pixel-color-swatch" style="background-color: {hoveredPixelColor}"></div>
												<span class="pixel-color-text">{hoveredPixelColor}</span>
											</div>
										{/if}
									</div>
								{/if}
							{:else}
								<div class="placeholder-image">
									<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
										<circle cx="8.5" cy="8.5" r="1.5"/>
										<polyline points="21 15 16 10 5 21"/>
									</svg>
									<p class="drop-text">Drop image or use button below</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Color Palette Strip -->
					<div class="palette-section">
						<div class="palette-controls-top">
							<div class="palette-count-controls">
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button class="icon-btn" on:click={decreasePalette}>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<line x1="5" y1="12" x2="19" y2="12"/>
									</svg>
								</button>
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button class="icon-btn" on:click={increasePalette}>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<line x1="12" y1="5" x2="12" y2="19"/>
										<line x1="5" y1="12" x2="19" y2="12"/>
									</svg>
								</button>
							</div>

							<!-- svelte-ignore a11y_consider_explicit_label -->
							<div class="palette-actions">
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button class="icon-btn" on:click={downloadPalette}>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
										<polyline points="7 10 12 15 17 10"/>
										<line x1="12" y1="15" x2="12" y2="3"/>
									</svg>
								</button>
								<button class="icon-btn" on:click={savePalette}>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
										<polyline points="17 21 17 13 7 13 7 21"/>
										<polyline points="7 3 7 8 15 8"/>
									</svg>
								</button>
							</div>
						</div>

						<div class="palette-strip">
							{#each paletteColors.slice(0, paletteCount) as color}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div
									class="color-swatch"
									class:selected={color === selectedColor}
									style="background-color: {color}"
									on:click={() => selectColor(color)}
								></div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Right Column -->
				<div class="right-column">
					<!-- Selected Color Display -->
					<div class="color-display-section">
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="section-label">Selected Colors</label>
						<div class="color-preview-pair">
							<div class="color-preview-box-wrapper">
								<div class="color-preview-box" style="background-color: {selectedColor}"></div>
								<span class="color-preview-label">Selected</span>
							</div>
							<div class="color-preview-box-wrapper">
								<div
									class="color-preview-box"
									class:empty={!hoveredPixelColor}
									style="background-color: {hoveredPixelColor || '#f3f4f6'}"
								></div>
								<span class="color-preview-label">Hover</span>
							</div>
						</div>
					</div>

					<!-- Color Value Fields -->
					<div class="color-values-section">
						<div class="color-value-row">
							<span class="value-label">HEX</span>
							<div class="value-container">
								<span class="value-text">{colorValues.hex}</span>
								<button class="copy-btn" on:click={() => copyToClipboard(colorValues.hex)}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
									</svg>
								</button>
							</div>
						</div>

						<div class="color-value-row">
							<span class="value-label">RGB</span>
							<div class="value-container">
								<span class="value-text">{colorValues.rgb}</span>
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button class="copy-btn" on:click={() => copyToClipboard(colorValues.rgb)}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
									</svg>
								</button>
							</div>
						</div>

						<div class="color-value-row">
							<span class="value-label">HSL</span>
							<div class="value-container">
								<span class="value-text">{colorValues.hsl}</span>
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<button class="copy-btn" on:click={() => copyToClipboard(colorValues.hsl)}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
									</svg>
								</button>
							</div>
						</div>

						<a href="#details" class="details-link">View color details →</a>
					</div>

					<!-- Utility Panel -->
					<div class="utility-panel">
						<h3 class="utility-title">Use your own image</h3>

						<button class="btn-primary" on:click={useOwnImage}>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="17 8 12 3 7 8"/>
								<line x1="12" y1="3" x2="12" y2="15"/>
							</svg>
							Use your image
						</button>

						{#if eyeDropperSupported}
					<button class="btn-secondary" on:click={pickFromScreen}>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
								<line x1="16" y1="8" x2="2" y2="22"/>
								<line x1="17.5" y1="15" x2="9" y2="15"/>
							</svg>
							Pick from Screen
						</button>
					{/if}

						<div class="privacy-note">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
							</svg>
							<span>All processing happens locally on your device</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 'Roboto', sans-serif;
		background-color: #f5f7fa;
	}

	main {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.container {
		width: 100%;
		max-width: 1200px;
	}

	.card {
		background: white;
		border-radius: 16px;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
		padding: 3rem;
	}

	.two-column {
		display: grid;
		grid-template-columns: 65fr 35fr;
		gap: 3rem;
	}

	/* Left Column */
	.left-column {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.section-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
		margin-bottom: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.image-preview {
		background: #f9fafb;
		border-radius: 12px;
		min-height: 300px;
		max-height: 600px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		border: 2px dashed transparent;
		transition: all 0.2s;
	}

	.image-preview.dragging {
		border-color: #6366f1;
		background: #eef2ff;
	}

	.placeholder-image {
		color: #d1d5db;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.drop-text {
		font-size: 0.875rem;
		color: #9ca3af;
		margin: 0;
	}

	.image-container {
		width: 100%;
		height: 100%;
		position: relative;
		border-radius: 12px;
		overflow: hidden;
	}

	.uploaded-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
		cursor: crosshair;
		display: block;
	}

	.zoom-loupe {
		position: absolute;
		pointer-events: none;
		z-index: 1000;
		transform: translate(20px, -180px);
		will-change: transform;
	}

	.zoom-canvas {
		display: block;
		width: 150px;
		height: 150px;
		border: 3px solid #111827;
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		background: white;
		image-rendering: pixelated;
		image-rendering: -moz-crisp-edges;
		image-rendering: crisp-edges;
	}

	.pixel-color-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		border: 2px solid #111827;
	}

	.pixel-color-swatch {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.2);
		flex-shrink: 0;
	}

	.pixel-color-text {
		font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		color: #111827;
		text-transform: uppercase;
	}

	.palette-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.palette-controls-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.palette-count-controls {
		display: flex;
		gap: 0.5rem;
	}

	.palette-actions {
		display: flex;
		gap: 0.5rem;
	}

	.icon-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid #e5e7eb;
		background: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		color: #6b7280;
	}

	.icon-btn:hover {
		background: #f9fafb;
		border-color: #d1d5db;
	}

	.palette-strip {
		display: flex;
		gap: 0.75rem;
		height: 64px;
	}

	.color-swatch {
		flex: 1;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
	}

	.color-swatch:hover {
		transform: translateY(-2px);
	}

	.color-swatch.selected {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 3px white, 0 0 0 5px rgba(99, 102, 241, 0.5);
	}

	/* Right Column */
	.right-column {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.color-display-section {
		display: flex;
		flex-direction: column;
	}

	.color-preview-pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.color-preview-box-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.color-preview-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.color-preview-box {
		aspect-ratio: 1;
		border-radius: 12px;
		cursor: pointer;
		transition: transform 0.2s;
	}

	.color-preview-box:hover {
		transform: scale(1.02);
	}

	.color-preview-box.empty {
		background: repeating-linear-gradient(
			45deg,
			#f3f4f6,
			#f3f4f6 10px,
			#e5e7eb 10px,
			#e5e7eb 20px
		);
		cursor: default;
	}

	.color-preview-box.empty:hover {
		transform: none;
	}

	.color-values-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.color-value-row {
		display: grid;
		grid-template-columns: 48px 1fr;
		align-items: center;
		gap: 1rem;
	}

	.value-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.value-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 0.625rem 0.875rem;
		font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
		font-size: 0.875rem;
	}

	.value-text {
		color: #111827;
	}

	.copy-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: #9ca3af;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s;
	}

	.copy-btn:hover {
		color: #6b7280;
	}

	.details-link {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #6366f1;
		text-decoration: none;
		transition: color 0.2s;
	}

	.details-link:hover {
		color: #4f46e5;
	}

	/* Utility Panel */
	.utility-panel {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.utility-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: #111827;
		margin: 0 0 0.25rem 0;
	}

	.btn-primary {
		background: #111827;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: background 0.2s;
	}

	.btn-primary:hover {
		background: #1f2937;
	}

	.btn-secondary {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: all 0.2s;
	}

	.btn-secondary:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.privacy-note {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.privacy-note svg {
		flex-shrink: 0;
		color: #9ca3af;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.two-column {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.card {
			padding: 2rem;
		}
	}

	@media (max-width: 640px) {
		main {
			padding: 1rem;
		}

		.card {
			padding: 1.5rem;
		}

		.palette-strip {
			height: 48px;
		}
	}
</style>
