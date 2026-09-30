interface LandingProps {
  onGetStarted: () => void;
}

function Landing({ onGetStarted }: LandingProps) {
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out;
        }
        .grid-pattern {
          background-image: linear-gradient(to right, #1f1f1f 1px, transparent 1px), linear-gradient(to bottom, #1f1f1f 1px, transparent 1px);
          background-size: 4rem 4rem;
        }
        .orb {
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          animation: pulse 4s ease-in-out infinite;
        }
        .orb-1 {
          animation-delay: 0s;
        }
        .orb-2 {
          animation-delay: 1s;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.2; }
        }
      `}</style>
      <div className="min-h-screen bg-gray-900 text-gray-100 overflow-hidden relative">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 grid-pattern opacity-20"></div>
          <div className="orb orb-1 absolute top-0 left-1/4 w-96 h-96 bg-gray-600"></div>
          <div className="orb orb-2 absolute bottom-0 right-1/4 w-96 h-96 bg-gray-500"></div>
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
          <div className="max-w-4xl w-full animate-fadeInUp">
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-2 bg-gray-800 border border-gray-600 rounded-full text-sm text-gray-400 mb-6">
                Lightweight. Linux-First. No Electron.
              </div>

              <h1 className="text-6xl font-bold mb-6 bg-linear-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
                Kyvyrn
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Turn web apps into clean, native desktop applications. Built
                with Tauri and Rust for minimal overhead and maximum
                performance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 transition-all hover:border-gray-500 hover:scale-105">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-4 transition-colors hover:bg-gray-700">
                  <svg
                    className="w-6 h-6 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    ></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  App-Mode Launching
                </h3>
                <p className="text-sm text-gray-400">
                  No tabs, no address bar, no browser clutter
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 transition-all hover:border-gray-500 hover:scale-105">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-4 transition-colors hover:bg-gray-700">
                  <svg
                    className="w-6 h-6 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  System Web Engines
                </h3>
                <p className="text-sm text-gray-400">
                  Uses native browsers via Tauri—no Electron bloat
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 transition-all hover:border-gray-500 hover:scale-105">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-4 transition-colors hover:bg-gray-700">
                  <svg
                    className="w-6 h-6 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m5.2-14.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m14.2 5.2l-4.2-4.2m0-6l4.2-4.2"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Per-App Configuration
                </h3>
                <p className="text-sm text-gray-400">
                  Each app has isolated settings and preferences
                </p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-lg text-lg font-semibold border-none cursor-pointer transition-all hover:bg-gray-100 hover:scale-105 hover:shadow-2xl"
              >
                Get Started
                <svg
                  className="w-6 h-6 transition-transform hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>

              <p className="text-gray-400 text-sm mt-4">
                Open source • Built with React & Tauri
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Landing;
