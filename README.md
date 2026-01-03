# Image Color Picker

A web application for extracting and analyzing colors from images.

> **Note:** This was a toy project to learn more about SvelteKit and the Svelte framework itself.

## Features

### Color Extraction
- **K-means Clustering**: Automatically extracts 3-10 dominant colors from any image
- **Pixel-Perfect Picking**: Hover over any pixel with a magnified 15×15 grid view for precise color selection
- **Screen Color Picker**: Pick colors from anywhere on your screen using the EyeDropper API (Chrome/Edge)

### Image Input
- **Drag & Drop**: Drop images directly onto the preview area
- **File Upload**: Click to browse and select images from your device
- **Keyboard Paste**: Press Ctrl/Cmd+V to paste images from clipboard
- **Default Image**: Loads with a test image for immediate exploration

## Getting Started

### Installation

```bash
git clone <repository-url>
cd image-color-picker
pnpm install
pnpm run dev

# Open in browser
# Navigate to http://localhost:5173
```

## Usage

1. **Load an Image**
   - Drag and drop an image onto the preview area
   - Click "Use your image" to select a file
   - Paste an image with Ctrl/Cmd+V
   - Use the default test image on page load

2. **Extract Dominant Colors**
   - Adjust palette size using +/- buttons
   - View extracted colors in the palette strip
   - Click any color to select it

3. **Pick Specific Pixels**
   - Hover over the image to see a magnified pixel grid
   - Move cursor to target specific pixels
   - Click to select that exact pixel's color

4. **Pick from Screen** (Chrome/Edge only)
   - Click "Pick from Screen"
   - Use the system color picker to select any color on your screen
   - Selected color replaces the image and shows in the palette

5. **Copy Color Values**
   - View color in HEX, RGB, and HSL formats
   - Click copy icon next to any value to copy to clipboard


## Color Extraction Algorithm

The app uses k-means clustering to extract dominant colors:

1. **Sampling**: Samples every 5th pixel for performance
2. **Clustering**: Groups similar colors using Euclidean distance
3. **Iteration**: Refines centroids over 10 iterations
4. **Sorting**: Orders colors by cluster size (most dominant first)

## License

MIT