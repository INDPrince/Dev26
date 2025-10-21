import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';

const PWAInstallBanner = ({ className = '' }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if install prompt is ready
    const checkPrompt = () => {
      if (window.deferredPWAPrompt) {
        setDeferredPrompt(window.deferredPWAPrompt);
        setShowBanner(true);
      }
    };

    // Check immediately
    checkPrompt();

    // Listen for the custom event
    const handleInstallable = () => {
      checkPrompt();
    };

    window.addEventListener('pwa-installable', handleInstallable);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`[PWA] User response: ${outcome}`);
      
      if (outcome === 'accepted') {
        setShowBanner(false);
        localStorage.removeItem('pwa_prompt_ready');
      }
      
      setDeferredPrompt(null);
      window.deferredPWAPrompt = null;
    } catch (error) {
      console.error('[PWA] Install error:', error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] animate-slide-up ${className}`}>
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl shadow-2xl p-5 max-w-md mx-auto flex items-center gap-4">
        <div className="flex-1">
          <div className="font-bold text-lg mb-1 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Install App
          </div>
          <div className="text-sm opacity-90">
            Install QuizMaster for offline access & better experience
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-5 py-2 rounded-lg"
          >
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
