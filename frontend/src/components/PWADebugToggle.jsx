import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Shield, ShieldOff, RefreshCw } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const PWADebugToggle = () => {
  const [isPWADisabled, setIsPWADisabled] = useState(false);
  const [swStatus, setSwStatus] = useState('checking');

  useEffect(() => {
    checkPWAStatus();
  }, []);

  const checkPWAStatus = async () => {
    // Check if PWA is disabled in localStorage
    const disabled = localStorage.getItem('pwa_debug_disabled') === 'true';
    setIsPWADisabled(disabled);
    
    // Check service worker status
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      setSwStatus(registrations.length > 0 ? 'active' : 'inactive');
    } else {
      setSwStatus('unsupported');
    }
  };

  const togglePWA = async () => {
    const newState = !isPWADisabled;
    
    try {
      if (newState) {
        // Disable PWA
        localStorage.setItem('pwa_debug_disabled', 'true');
        
        // Unregister all service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
          }
          console.log('✅ Service Workers unregistered');
        }
        
        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (let cacheName of cacheNames) {
            await caches.delete(cacheName);
          }
          console.log('✅ Caches cleared');
        }
        
        toast({
          title: "🔴 PWA Disabled",
          description: "Service Worker unregistered. Reloading...",
          variant: "default"
        });
        
      } else {
        // Enable PWA
        localStorage.removeItem('pwa_debug_disabled');
        
        toast({
          title: "🟢 PWA Enabled",
          description: "Reloading to register Service Worker...",
          variant: "default"
        });
      }
      
      setIsPWADisabled(newState);
      
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error toggling PWA:', error);
      toast({
        title: "Error",
        description: "Failed to toggle PWA: " + error.message,
        variant: "destructive"
      });
    }
  };

  const refreshStatus = async () => {
    await checkPWAStatus();
    toast({
      title: "Status Updated",
      description: `Service Worker: ${swStatus}`,
      variant: "default"
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      <Button
        onClick={togglePWA}
        variant={isPWADisabled ? "destructive" : "default"}
        size="lg"
        className="shadow-2xl rounded-full px-6 py-6 flex items-center gap-3 font-bold text-base"
        style={{
          background: isPWADisabled ? '#ef4444' : '#10b981',
          color: 'white',
          border: '3px solid white'
        }}
      >
        {isPWADisabled ? (
          <>
            <ShieldOff className="w-6 h-6" />
            <span>PWA OFF</span>
          </>
        ) : (
          <>
            <Shield className="w-6 h-6" />
            <span>PWA ON</span>
          </>
        )}
      </Button>
      
      <button
        onClick={refreshStatus}
        className="bg-gray-700 text-white text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1 justify-center hover:bg-gray-600"
      >
        <RefreshCw className="w-3 h-3" />
        SW: {swStatus}
      </button>
    </div>
  );
};

export default PWADebugToggle;
