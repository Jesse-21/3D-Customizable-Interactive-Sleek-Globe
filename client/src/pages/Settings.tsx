import GlobeBackground from "@/components/GlobeBackground";
import GlobeControls from "@/components/GlobeControls";
import DownloadPackage from "@/components/DownloadPackage";
import { useGlobeSettings, RGBColor, LocationCoordinates } from "@/hooks/useGlobeSettings";
import { ArrowLeft, Download } from "lucide-react";
import { Link } from "wouter";

export default function Settings() {
  const {
    settings,
    updateRotationSpeed,
    updateMouseSensitivity,
    updateDotSize,
    updateGlobeSize,
    updateAutoRotate,
    updateLandColor,
    updateHaloColor,
    updateGlitchEffect,
    updateShowArcs,
    updateArcColor,
    updateHeadquartersLocation,
    updateShowVisitorMarkers,
    updateOffsetX,
    updateOffsetY
  } = useGlobeSettings();
  
  return (
    <>
      <GlobeBackground settings={settings} />
      
      {/* Header with back button */}
      <header className="fixed top-0 w-full z-10 p-4 md:p-6 flex justify-between items-center">
        <Link href="/">
          <button className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors py-1 px-3 rounded-full bg-white/5 hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="#download">
            <button className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors py-1 px-3 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          </Link>
        </div>
      </header>
      
      {/* Main content - settings page */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20">
        <div className="max-w-4xl w-full mx-auto bg-black/40 backdrop-blur-md p-8 rounded-xl border border-white/10 shadow-xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            Customize Your Globe
          </h1>
          <p className="text-lg mb-8 text-white/80 leading-relaxed">
            Adjust the settings below to customize the appearance and behavior of your 3D globe. 
            All changes are previewed in real-time and will be saved automatically.
          </p>
          
          {/* Globe controls - this is already loaded here without toggle */}
          <div className="mb-10">
            <GlobeControls 
              settings={settings}
              onRotationSpeedChange={updateRotationSpeed}
              onMouseSensitivityChange={updateMouseSensitivity}
              onDotSizeChange={updateDotSize}
              onGlobeSizeChange={updateGlobeSize}
              onAutoRotateChange={updateAutoRotate}
              onLandColorChange={updateLandColor}
              onHaloColorChange={updateHaloColor}
              onGlitchEffectChange={updateGlitchEffect}
              onShowArcsChange={updateShowArcs}
              onArcColorChange={updateArcColor}
              onHeadquartersLocationChange={updateHeadquartersLocation}
              onShowVisitorMarkersChange={updateShowVisitorMarkers}
              onOffsetXChange={updateOffsetX}
              onOffsetYChange={updateOffsetY}
            />
          </div>

          {/* Download section */}
          <div id="download" className="mt-16 pt-6 border-t border-white/10">
            <h2 className="text-2xl font-bold mb-6 text-white">Download Your Customized Globe</h2>
            <p className="text-white/70 mb-6">
              Once you're happy with your settings, download a ready-to-use package with your current configurations. 
              The package includes all necessary files and instructions to add this globe to your website.
            </p>
            
            <DownloadPackage settings={settings} />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-6 mt-8 text-white/50 text-sm">
        Built with React, TypeScript, Tailwind CSS and COBE
      </footer>
    </>
  );
}