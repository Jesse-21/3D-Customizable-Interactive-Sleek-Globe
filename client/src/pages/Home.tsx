import GlobeBackground from "@/components/GlobeBackground";
import GlobeControls from "@/components/GlobeControls";
import { useGlobeSettings } from "@/hooks/useGlobeSettings";
import { GlobeIcon, Github } from "lucide-react";

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
      
      {/* Header with github link */}
      <header className="fixed top-0 w-full z-10 p-4 md:p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <GlobeIcon className="h-5 w-5 text-indigo-400" />
          <span className="text-lg font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Interactive Globe
          </span>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors py-1 px-3 rounded-full bg-white/5 hover:bg-white/10"
        >
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">View on GitHub</span>
        </a>
      </header>
      
      {/* Page content that will appear above the globe */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full bg-black/40 backdrop-blur-md p-8 rounded-xl border border-white/10 shadow-xl">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            Interactive 3D Globe Background
          </h1>
          <p className="text-lg mb-8 text-white/80 leading-relaxed">
            This demo showcases an oversized, interactive 3D dot globe that functions as a website background.
            The globe responds to mouse movements while your website content remains in the foreground.
            <span className="block mt-2 text-indigo-300">Your visitor's location is marked with an orange dot that persists for 30 days.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium py-2 px-6 rounded-lg hover:opacity-90 transition duration-200">
              Get Started
            </button>
            <button className="border border-white/20 py-2 px-6 rounded-lg hover:bg-white/5 transition duration-200">
              Learn More
            </button>
          </div>
          
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-indigo-300">Interactive</h3>
              <p className="text-sm text-white/70">Responds to mouse movements, allowing visitors to interact with the background.</p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-indigo-300">Customizable</h3>
              <p className="text-sm text-white/70">Adjust globe size, dot size, rotation speed, and other parameters.</p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-indigo-300">Visitor Location</h3>
              <p className="text-sm text-white/70">Marks visitor location with a dot that persists for 30 days.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-4 text-white/50 text-sm">
        Built with React, TypeScript, Tailwind CSS and COBE
      </footer>
      
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
