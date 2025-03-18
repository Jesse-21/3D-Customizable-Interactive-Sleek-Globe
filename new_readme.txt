      // Add README with instructions
      zip.file("README.md", `# Interactive Globe Background

This package provides an interactive 3D globe as a website background that responds to mouse movements.

## Features

- Oversized 3D dot globe as a website background
- Interactive rotation with mouse movements and touch support
- Auto-rotation with adjustable speed
- Custom land and halo colors
- Futuristic glitch effect option
- Optional visitor location marker that persists for 30 days
- Connection arcs with customizable animation
- Customizable positioning controls
- Fully customizable appearance

## Installation

1. Upload all files to your website's hosting service
2. Include the globe in your existing website by:
   - Copy the \`<canvas id="globe"></canvas>\` element to your HTML
   - Include the globe.js script in your HTML
   - Add the necessary CSS for positioning

## Customization

Edit the settings in globe.js to customize:

- \`rotationSpeed\`: Speed of auto-rotation
- \`mouseSensitivity\`: Sensitivity of mouse interaction
- \`dotSize\`: Size of the dots making up the globe
- \`globeSize\`: Overall size of the globe
- \`autoRotate\`: Whether the globe automatically rotates
- \`landColor\`: Color of continents and land masses [R,G,B] (values 0-1)
- \`haloColor\`: Color of the glow around the globe [R,G,B] (values 0-1)
- \`glitchEffect\`: Enable futuristic glitch effect with random color disruptions
- \`showArcs\`: Enable or disable connection arcs
- \`arcColor\`: Color of connection arcs [R,G,B] (values 0-1)
- \`arcAltitude\`: How high the arcs travel above the globe (0.1-1)
- \`arcAnimationSpeed\`: Speed of arc animations (0.1-2)
- \`arcDensity\`: Number of arcs to display (1-10)
- \`showVisitorLocation\`: Whether to show the visitor's location marker
- \`offsetX\`: Horizontal position offset in percentage (-50 to 50)
- \`offsetY\`: Vertical position offset in percentage (-50 to 50)

## Credits

This package uses the COBE library (https://github.com/shuding/cobe) for the WebGL globe rendering.
`);
