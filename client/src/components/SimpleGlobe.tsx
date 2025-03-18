import React, { useRef, useEffect } from 'react';
import createGlobe from 'cobe';

const SimpleGlobe = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCountRef = useRef(0);
  
  // Initialize minimal COBE globe
  useEffect(() => {
    let globe: any;
    
    if (canvasRef.current) {
      try {
        console.log("Creating minimal globe");
        
        // Super minimal configuration to test COBE functionality
        globe = createGlobe(canvasRef.current, {
          devicePixelRatio: window.devicePixelRatio || 2,
          width: 800,
          height: 800,
          phi: 0,
          theta: 0,
          dark: 1,
          diffuse: 1.2,
          mapSamples: 16000,
          mapBrightness: 6,
          baseColor: [0.3, 0.3, 0.3] as [number, number, number],
          markerColor: [0.1, 0.8, 1] as [number, number, number],
          glowColor: [1, 1, 1] as [number, number, number],
          scale: 1.0,
          onRender: (state: any) => {
            // Simple auto-rotation
            state.phi += 0.01;
            
            // Logging
            frameCountRef.current += 1;
            if (frameCountRef.current % 100 === 0) {
              console.log(`Simple globe render frame #${frameCountRef.current}`);
            }
          }
        });
        
        console.log("Simple globe created successfully");
      } catch (error) {
        console.error("Error creating simple globe:", error);
      }
    }
    
    // Cleanup
    return () => {
      if (globe) {
        globe.destroy();
      }
    };
  }, []);
  
  return (
    <div style={{ 
      position: "fixed", 
      top: 0, 
      left: 0, 
      width: "100%", 
      height: "100%", 
      background: "black"
    }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90vw",
          height: "90vh",
        }}
      />
    </div>
  );
};

export default SimpleGlobe;