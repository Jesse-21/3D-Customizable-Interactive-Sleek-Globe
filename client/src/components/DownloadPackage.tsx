import { useState } from "react";
import { Download, HelpCircle } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { GlobeSettings } from "@/hooks/useGlobeSettings";

interface DownloadPackageProps {
  settings: GlobeSettings;
}

const DownloadPackage = ({ settings }: DownloadPackageProps) => {
  const [downloading, setDownloading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const generatePackage = async () => {
    setDownloading(true);
    
    try {
      const zip = new JSZip();
      
      // Add HTML file
      zip.file("index.html", `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interactive Globe Background</title>
  <script src="https://unpkg.com/cobe@0.6.3/dist/index.js"></script>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      overflow: hidden;
      background-color: #050818;
    }
    
    canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      cursor: grab;
      touch-action: none;
    }
    
    #content {
      position: relative;
      z-index: 1;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 2rem;
    }
    
    /* You can modify or remove this example content styling */
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      border-radius: 1rem;
    }
  </style>
</head>
<body>
  <!-- The Canvas element is where the globe will be rendered -->
  <canvas id="globe"></canvas>
  
  <!-- Your website content goes here -->
  <div id="content">
    <div class="container">
      <h1>Your Website Content</h1>
      <p>This is an example of content that appears over the interactive globe background.</p>
      <p>Replace this with your own website content.</p>
    </div>
  </div>
  
  <!-- Globe script -->
  <script src="globe.js"></script>
</body>
</html>`);
      
      // Add JavaScript file with the current globe settings
      zip.file("globe.js", `document.addEventListener('DOMContentLoaded', () => {
  // Globe settings - you can modify these values
  const settings = {
    rotationSpeed: ${settings.rotationSpeed},
    mouseSensitivity: ${settings.mouseSensitivity},
    dotSize: ${settings.dotSize},
    globeSize: ${settings.globeSize},
    autoRotate: ${settings.autoRotate},
    landColor: [${settings.landColor[0]}, ${settings.landColor[1]}, ${settings.landColor[2]}],
    haloColor: [${settings.haloColor[0]}, ${settings.haloColor[1]}, ${settings.haloColor[2]}],
    glitchEffect: ${settings.glitchEffect},
    showVisitorLocation: true  // Set to false to disable visitor location marker
  };

  // Initialize globe
  initGlobe(settings);
});

// Function to initialize the globe
function initGlobe(settings) {
  const canvasElement = document.getElementById('globe');
  if (!canvasElement) return;
  
  // References for globe interaction
  let pointerInteracting = null;
  let pointerInteractionMovement = 0;
  let phi = 0;
  let theta = 0.3;
  let globeInstance = null;
  
  // Handle visitor location
  let visitorMarkers = [];
  
  if (settings.showVisitorLocation) {
    // Check if location is stored in localStorage
    const storedLocation = localStorage.getItem('visitorLocation');
    
    if (storedLocation) {
      try {
        const { location, timestamp } = JSON.parse(storedLocation);
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const isExpired = Date.now() - timestamp > thirtyDaysInMs;
        
        if (isExpired) {
          localStorage.removeItem('visitorLocation');
        } else {
          visitorMarkers.push({
            location: location,
            size: 0.1,
            color: [1, 0.5, 0], // Orange color
            timestamp: timestamp
          });
        }
      } catch (e) {
        console.error("Error parsing stored location:", e);
        localStorage.removeItem('visitorLocation');
      }
    } else if (navigator.geolocation) {
      // Get current location if permission is granted
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newMarker = {
            location: [position.coords.latitude, position.coords.longitude],
            size: 0.1,
            color: [1, 0.5, 0], // Orange color
            timestamp: Date.now()
          };
          
          // Save to localStorage
          localStorage.setItem('visitorLocation', JSON.stringify({
            location: [position.coords.latitude, position.coords.longitude],
            timestamp: Date.now()
          }));
          
          // Add marker
          visitorMarkers.push(newMarker);
          
          // Recreate the globe with the new marker
          if (globeInstance && typeof globeInstance === 'function') {
            globeInstance();
          }
          createGlobe();
        },
        (error) => {
          console.log("Geolocation error or permission denied:", error);
        }
      );
    }
  }
  
  // Store reference to glitch timer
  let glitchTimer = null;
  let lastGlitchTime = 0;
  
  // Create the globe
  function createGlobe(useGlitchColors = false) {
    if (!canvasElement) return;
    
    // Set canvas dimensions
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
    
    // Current phi value
    let currentPhi = phi;
    
    // Define land and glow colors (use glitch colors if requested)
    let baseColor = [...settings.landColor];
    let glowColor = [...settings.haloColor];
    
    // Apply glitch distortion if requested
    if (useGlitchColors) {
      // Create a distorted version of the land color
      baseColor = [
        Math.min(1, settings.landColor[0] + (Math.random() * 0.5 - 0.2)),
        Math.min(1, settings.landColor[1] + (Math.random() * 0.5 - 0.2)),
        Math.min(1, settings.landColor[2] + (Math.random() * 0.5 - 0.2)),
      ];
      
      // Create a distorted version of the glow color
      glowColor = [
        Math.min(1, settings.haloColor[0] + (Math.random() * 0.5 - 0.2)),
        Math.min(1, settings.haloColor[1] + (Math.random() * 0.5 - 0.2)),
        Math.min(1, settings.haloColor[2] + (Math.random() * 0.5 - 0.2)),
      ];
    }
    
    // Create the globe instance
    globeInstance = COBE(canvasElement, {
      devicePixelRatio: 2,
      width: canvasElement.width,
      height: canvasElement.height,
      phi: currentPhi,
      theta: theta,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: baseColor,
      markerColor: [0.1, 0.8, 1],
      glowColor: glowColor,
      scale: settings.globeSize,
      pointSize: settings.dotSize,
      markers: visitorMarkers,
      onRender: (state) => {
        // Auto rotation
        if (settings.autoRotate) {
          currentPhi += settings.rotationSpeed / 1000;
        }
        
        // When the user is interacting with the globe
        if (pointerInteracting !== null) {
          const pointerPhiDiff = pointerInteracting - pointerInteractionMovement;
          currentPhi += pointerPhiDiff * (settings.mouseSensitivity / 200);
          pointerInteractionMovement = pointerInteracting;
        }
        
        // Update the rotation state
        state.phi = currentPhi;
        phi = currentPhi;
      }
    });
    
    // Mouse interaction events
    const onPointerDown = (e) => {
      pointerInteracting = e.clientX;
      canvasElement.style.cursor = 'grabbing';
    };
    
    const onPointerUp = () => {
      pointerInteracting = null;
      canvasElement.style.cursor = 'grab';
    };
    
    const onPointerOut = () => {
      pointerInteracting = null;
      canvasElement.style.cursor = 'auto';
    };
    
    const onPointerMove = (e) => {
      if (pointerInteracting !== null) {
        pointerInteractionMovement = e.clientX;
      }
    };
    
    // Add touch-specific event handlers for mobile devices
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        pointerInteracting = e.touches[0].clientX;
        pointerInteractionMovement = e.touches[0].clientX;
      }
    };
    
    const onTouchMove = (e) => {
      if (e.touches.length === 1 && pointerInteracting !== null) {
        e.preventDefault();
        pointerInteractionMovement = e.touches[0].clientX;
      }
    };
    
    const onTouchEnd = () => {
      pointerInteracting = null;
    };
    
    // Add event listeners
    canvasElement.addEventListener('pointerdown', onPointerDown);
    canvasElement.addEventListener('pointerup', onPointerUp);
    canvasElement.addEventListener('pointerout', onPointerOut);
    canvasElement.addEventListener('pointermove', onPointerMove);
    
    // Add touch-specific event listeners for better mobile support
    canvasElement.addEventListener('touchstart', onTouchStart);
    canvasElement.addEventListener('touchmove', onTouchMove, { passive: false });
    canvasElement.addEventListener('touchend', onTouchEnd);
  }
  
  // Create the globe initially
  createGlobe();
  
  // Setup glitch effect if enabled
  if (settings.glitchEffect) {
    glitchTimer = setInterval(() => {
      if (!canvasElement || !globeInstance) return;
      
      // Only glitch occasionally and randomly
      if (Math.random() > 0.1) return;
      
      // Calculate time since last glitch to avoid too frequent glitches
      const now = Date.now();
      if (now - lastGlitchTime < 2000) return;
      lastGlitchTime = now;
      
      // Create a temporary color distortion
      const glitchDuration = 100 + Math.random() * 300; // 100-400ms glitch
      
      // Apply the glitch by reinitializing the globe with distorted settings
      try {
        // Store the current cleanup function
        const cleanup = globeInstance;
        
        // Create a new instance to cause a visual "glitch"
        if (typeof cleanup === 'function') {
          cleanup();
          
          // Force a small delay before recreating
          setTimeout(() => {
            if (canvasElement) {
              createGlobe(true); // Pass true to use glitch colors
              
              // Restore normal appearance after the glitch duration
              setTimeout(() => {
                if (canvasElement) {
                  // Only reinitialize if glitch effect is still enabled
                  if (settings.glitchEffect) {
                    const cleanup = globeInstance;
                    if (typeof cleanup === 'function') {
                      cleanup();
                      createGlobe(false); // Pass false to use normal colors
                    }
                  }
                }
              }, glitchDuration);
            }
          }, 30);
        }
      } catch (e) {
        console.error("Error during glitch effect:", e);
      }
    }, 5000); // Check for glitch opportunity every 5 seconds
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (globeInstance && typeof globeInstance === 'function') {
      globeInstance();
      globeInstance = null;
    }
    createGlobe();
  });
  
  // Clean up resources when page is closed or navigated away
  window.addEventListener('beforeunload', () => {
    if (glitchTimer) {
      clearInterval(glitchTimer);
    }
  });
}`);

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
- \`showVisitorLocation\`: Whether to show the visitor's location marker

## Credits

This package uses the COBE library (https://github.com/shuding/cobe) for the WebGL globe rendering.
`);

      // Add a sample CSS file for including just the globe
      zip.file("globe-only.css", `body, html {
  margin: 0;
  padding: 0;
  height: 100%;
}

.globe-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background-color: #050818;
}

canvas.globe-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}`);

      // Add a sample HTML snippet for including just the globe
      zip.file("globe-snippet.html", `<!-- Add this to your HTML -->
<div class="globe-container">
  <canvas id="globe" class="globe-canvas"></canvas>
</div>

<!-- Include the COBE library -->
<script src="https://unpkg.com/cobe@0.6.3/dist/index.js"></script>

<!-- Include the globe script -->
<script src="globe.js"></script>`);

      // Generate the zip file
      const blob = await zip.generateAsync({ type: "blob" });
      
      // Save the zip file
      saveAs(blob, "interactive-globe-background.zip");
    } catch (error) {
      console.error("Error generating package:", error);
      alert("There was an error generating the download package.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="my-10 w-full">
      <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              Download Globe Package
              <button 
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-indigo-300 hover:text-indigo-200 transition-colors"
                aria-label="Show instructions"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </h2>
            <p className="text-white/60 text-sm mt-1">
              Get a ready-to-use version of this globe for your own website
            </p>
          </div>
          
          <button
            onClick={generatePackage}
            disabled={downloading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium ${
              downloading 
                ? "bg-indigo-800/50 cursor-wait" 
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
            } transition-all duration-200`}
          >
            <Download className="h-4 w-4" />
            {downloading ? "Preparing..." : "Download Package"}
          </button>
        </div>
        
        {showInstructions && (
          <div className="mt-6 p-4 bg-black/20 rounded-lg border border-indigo-500/20">
            <h3 className="text-indigo-300 text-sm font-medium mb-2">How to use the downloaded package:</h3>
            <ol className="text-white/70 text-sm space-y-2 list-decimal pl-5">
              <li>Download and unzip the package</li>
              <li>Upload all files to your web hosting server</li>
              <li>Open index.html to see the complete example</li>
              <li>Use globe-snippet.html to add just the globe to an existing page</li>
              <li>Modify the settings in globe.js to customize the appearance</li>
            </ol>
            <p className="text-indigo-200/70 text-xs mt-4">
              The package includes the current globe configuration settings you selected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadPackage;