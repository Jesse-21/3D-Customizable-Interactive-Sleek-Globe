import GlobeBackground from "@/components/GlobeBackground";
import GlobeControls from "@/components/GlobeControls";
import { useGlobeSettings } from "@/hooks/useGlobeSettings";

export default function Home() {
  const {
    settings,
    updateRotationSpeed,
    updateMouseSensitivity,
    updateDotSize,
    updateGlobeSize,
    updateAutoRotate
  } = useGlobeSettings();
  
  return (
    <>
      <GlobeBackground settings={settings} />
      
      {/* Page content that will appear above the globe */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full bg-black bg-opacity-40 backdrop-blur-sm p-8 rounded-xl">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">Your Website Content</h1>
          <p className="text-lg mb-8">
            This is an example of how your website content would appear above the interactive 3D globe background. 
            The globe responds to mouse movements but doesn't interfere with the content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-white text-[#050818] font-medium py-2 px-6 rounded-lg hover:bg-opacity-90 transition duration-200">
              Primary Action
            </button>
            <button className="border border-white py-2 px-6 rounded-lg hover:bg-white hover:bg-opacity-10 transition duration-200">
              Secondary Action
            </button>
          </div>
        </div>
      </div>
      
      <GlobeControls 
        settings={settings}
        onRotationSpeedChange={updateRotationSpeed}
        onMouseSensitivityChange={updateMouseSensitivity}
        onDotSizeChange={updateDotSize}
        onGlobeSizeChange={updateGlobeSize}
        onAutoRotateChange={updateAutoRotate}
      />
    </>
  );
}
