import GlobeBackground from "@/components/GlobeBackground";
import DownloadPackage from "@/components/DownloadPackage";
import { useGlobeSettings } from "@/hooks/useGlobeSettings";
import { GlobeIcon, Github, Zap, Eye } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { settings } = useGlobeSettings();
  
  return (
    <>
      <GlobeBackground settings={settings} />
      
      {/* Header with navigation */}
      <header className="fixed top-0 w-full z-10 p-4 md:p-6 flex justify-end items-center">
        <div className="flex items-center gap-2">
          <Link href="/preview">
            <button className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors py-1 px-3 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 mr-2 backdrop-blur-sm">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview Mode</span>
            </button>
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors py-1 px-3 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">View on GitHub</span>
          </a>
        </div>
      </header>
      
      {/* We've removed the floating text that made the page hard to read */}
      
      {/* Main content positioned to the right, allowing the globe to be fully visible on the left */}
      <div className="relative z-10 min-h-screen flex flex-col items-end justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl ml-auto mr-0 bg-black/40 backdrop-blur-md p-8 rounded-xl border border-white/10 shadow-xl">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            Interactive 3D Globe Background
          </h1>
          <p className="text-lg mb-8 text-white/80 leading-relaxed">
            This demo showcases an oversized, interactive 3D dot globe that functions as a website background.
            The globe responds to mouse movements while your website content remains in the foreground.
            <span className="block mt-2 text-indigo-300"><strong>Optional:</strong> Your visitor's location is marked with an orange dot that persists for 30 days.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#download" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium py-2 px-6 rounded-lg hover:opacity-90 transition duration-200 text-center">
              Download For Your Site
            </a>
            <Link href="/preview">
              <button className="border border-white/20 py-2 px-6 rounded-lg hover:bg-white/5 transition duration-200 flex items-center justify-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Preview Mode</span>
              </button>
            </Link>
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
              <h3 className="text-lg font-medium mb-2 flex items-center gap-1">
                <span className="text-indigo-300">Visual Effects</span>
                <Zap className="h-4 w-4 text-yellow-400" />
              </h3>
              <p className="text-sm text-white/70">Custom colors, glitch effects, and futuristic visual touches.</p>
            </div>
          </div>
          
          {/* Preview mode callout */}
          <div className="mt-8 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-500/20 p-2 rounded-full">
                <Eye className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1 text-indigo-200">Preview Mode</h3>
                <p className="text-sm text-white/70 mb-3">
                  For a clearer view of the globe while adjusting settings, use our dedicated Preview Mode.
                  This provides a distraction-free environment where you can see exactly how your changes affect the globe.
                </p>
                <Link href="/preview">
                  <button className="flex items-center gap-2 text-sm text-white bg-indigo-600/50 hover:bg-indigo-600/70 transition-colors py-1.5 px-4 rounded-md">
                    <Eye className="h-4 w-4" />
                    <span>Enter Preview Mode</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Download section */}
          <div id="download" className="mt-16 pt-6 border-t border-white/10">
            <h2 className="text-2xl font-bold mb-6 text-white">Add This Globe To Your Website</h2>
            <p className="text-white/70 mb-6">
              Download a ready-to-use package with your current globe settings. 
              Just upload the files to your website and include the code snippets as instructed.
            </p>
            
            <DownloadPackage settings={settings} />
          </div>
          
          {/* How it works section */}
          <div className="mt-16 pt-6 border-t border-white/10">
            <h2 className="text-2xl font-bold mb-6 text-white">How It Works</h2>
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2 text-indigo-300">WebGL Rendering</h3>
                <p className="text-sm text-white/70">
                  The globe is rendered using WebGL through the COBE library, providing smooth performance 
                  even for complex 3D visualizations in the browser.
                </p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2 text-indigo-300">Geolocation API</h3>
                <p className="text-sm text-white/70">
                  Visitor location markers use the browser's Geolocation API to determine coordinates, 
                  which are then stored locally for 30 days.
                </p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2 text-indigo-300">LocalStorage Persistence</h3>
                <p className="text-sm text-white/70">
                  Settings and visitor location data are stored in the browser's localStorage, 
                  ensuring persistence without requiring server-side storage.
                </p>
              </div>
            </div>
          </div>
          
          {/* Additional information about the Preview section */}
          <div id="customize-section" className="mt-16 pt-6 border-t border-white/10">
            <h2 className="text-2xl font-bold mb-6 text-white">Experience the Globe in Preview Mode</h2>
            <p className="text-white/70 mb-6">
              For the best viewing experience and to see the full interactive capabilities of the globe, 
              try our distraction-free Preview Mode where you can focus entirely on the visualization.
            </p>
            <Link href="/preview">
              <button className="flex items-center gap-2 text-white font-medium bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 px-6 rounded-lg hover:opacity-90 transition duration-200">
                <Eye className="h-5 w-5" />
                <span>Enter Preview Mode</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Enhanced Footer with more information */}
      <footer className="relative z-10 w-full bg-black/30 backdrop-blur-sm text-center py-8 mt-8 text-white/60 text-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>GitHub Repository</span>
            </a>
            <span className="hidden md:inline text-white/30">•</span>
            <span>Built with React, TypeScript, Tailwind CSS and COBE</span>
            <span className="hidden md:inline text-white/30">•</span>
            <Link href="/preview" className="flex items-center gap-2 hover:text-white transition-colors">
              <Eye className="h-4 w-4" />
              <span>Preview Mode</span>
            </Link>
          </div>
          <p className="text-white/40 text-xs">
            Interactive 3D dot globe that functions as a beautiful and engaging website background
          </p>
        </div>
      </footer>
    </>
  );
}
