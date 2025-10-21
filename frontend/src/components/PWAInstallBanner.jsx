import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';

const PWAInstallBanner = ({ className = '' }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showProgressOnly, setShowProgressOnly] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [cacheProgress, setCacheProgress] = useState(0);
  const [isCaching, setIsCaching] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if install prompt is ready
    const checkPrompt = () => {
      if (window.deferredPWAPrompt) {
        setDeferredPrompt(window.deferredPWAPrompt);
        setShowBanner(true);
        setIsCaching(true);
      }
    };

    // Check immediately
    checkPrompt();

    // Listen for the custom event
    const handleInstallable = () => {
      checkPrompt();
    };

    // Listen for update available
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      setShowBanner(true);
      setIsCaching(true);
    };

    // Listen for service worker messages about cache progress
    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'CACHE_PROGRESS') {
        setCacheProgress(event.data.progress);
        if (!isCaching) {
          setIsCaching(true);
        }
      } else if (event.data && event.data.type === 'CACHE_COMPLETE') {
        setCacheProgress(100);
        setTimeout(() => {
          setIsCaching(false);
          setShowProgressOnly(false);
        }, 1000);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  // Cache progress is now handled by service worker messages

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`[PWA] User response: ${outcome}`);
      
      if (outcome === 'accepted') {
        setShowBanner(false);
        setShowProgressOnly(false);
        localStorage.removeItem('pwa_prompt_ready');
      } else {
        // User declined, but keep progress bar visible
        setShowBanner(false);
        setShowProgressOnly(true);
      }
      
      setDeferredPrompt(null);
      window.deferredPWAPrompt = null;
    } catch (error) {
      console.error('[PWA] Install error:', error);
    }
  };

  const handleUpdate = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Keep progress bar running in background
    if (isCaching) {
      setShowProgressOnly(true);
    }
  };

  // Progress bar only view
  if (showProgressOnly && isCaching) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] w-[90%] max-w-[360px]">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-2xl p-3">
          <div className="text-xs font-medium mb-2 opacity-90">Installing for offline access...</div>
          <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${cacheProgress}%` }}
            />
          </div>
          <div className="text-[10px] mt-1 opacity-75">{Math.round(cacheProgress)}%</div>
        </div>
      </div>
    );
  }

  if (!showBanner) {
    return null;
  }

  // Update notification
  if (updateAvailable) {
    return (
      <div className={`fixed top-5 right-5 z-[9998] animate-elastic-slide-right max-w-[90vw] ${className}`}>
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl shadow-2xl p-4 w-[340px] max-w-full">
          <div className="font-bold text-sm mb-1">🎉 New Update Available!</div>
          <div className="text-xs opacity-95 mb-2">A new version is ready. Refresh to update.</div>
          
          {isCaching && (
            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                style={{ width: `${cacheProgress}%` }}
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={handleUpdate}
              className="bg-white text-rose-600 hover:bg-gray-100 font-semibold px-4 py-2 rounded-lg text-xs flex-1"
            >
              Update Now
            </Button>
            <button
              onClick={handleDismiss}
              className="text-white bg-transparent border border-white/40 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-xs flex-1"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Install banner with animations from test-animations.html
  return (
    <div 
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[9998] max-w-[90%] w-[360px] animate-elastic-slide-up ${className}`}
    >
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1">
            <div className="font-bold text-[15px] mb-1 flex items-center gap-2">
              <Download className="w-4 h-4" />
              📱 Install App
            </div>
            <div className="text-xs opacity-90">
              Install QuizMaster for offline access
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            data-testid="dismiss-pwa-banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {isCaching && (
          <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${cacheProgress}%` }}
            />
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-4 py-2 rounded-lg text-sm flex-1"
            data-testid="install-pwa-button"
          >
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="text-white bg-transparent border border-white/30 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-sm flex-1"
            data-testid="later-pwa-button"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
