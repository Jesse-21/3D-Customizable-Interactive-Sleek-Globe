import React, { useRef, useEffect } from 'react';
import createGlobe from 'cobe';

const SimpleGlobe = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  useEffect(() => {
    let phi = 0;
    let globe: any = null;
    
    if (canvasRef.current) {
      try {
        console.log("Creating basic COBE globe");
        
        // Using exact parameters from COBE documentation
        globe = createGlobe(canvasRef.current, {
          devicePixelRatio: 2,
          width: 600, 
          height: 600,
          phi: 0,
          theta: 0,
          dark: 1,
          diffuse: 1.2,
          mapSamples: 16000,
          mapBrightness: 8,
          baseColor: [0.5, 0.5, 0.5],
          markerColor: [0.1, 0.8, 1],
          glowColor: [1, 1, 1],
          markers: [],
          enableDrag: true,
          onRender: (state) => {
            // Auto rotation when not dragging
            if (!state.dragging) {
              state.phi = phi;
              phi += 0.005;
            }
          }
        });
      } catch (error) {
        console.error("COBE initialization error:", error);
      }
    }
    
    return () => {
      if (globe) {
        globe.destroy();
      }
    };
  }, []);
  
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        style={{
          width: '80vmin',
          height: '80vmin'
        }}
      />
    </div>
  );
};

export default SimpleGlobe;