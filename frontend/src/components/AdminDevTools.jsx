import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Copy, Trash2, Shield, ShieldOff, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

const AdminDevTools = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [swStatus, setSwStatus] = useState('checking');
  const [logs, setLogs] = useState(() => {
    // Load logs from localStorage on init
    const savedLogs = localStorage.getItem('admin_console_logs');
    return savedLogs ? JSON.parse(savedLogs) : [];
  });
  const [isPWAActive, setIsPWAActive] = useState(false);
  const [isPWADisabled, setIsPWADisabled] = useState(false);
  const logsEndRef = useRef(null);

  // Check if admin is logged in
  useEffect(() => {
    const checkAdmin = () => {
      const isAdmin = localStorage.getItem('adminAuth') === 'true';
      setIsVisible(isAdmin);
    };

    checkAdmin();
    // Check periodically in case admin logs out
    const interval = setInterval(checkAdmin, 2000);
    return () => clearInterval(interval);
  }, []);

  // Check PWA/SW status
  useEffect(() => {
    if (!isVisible) return;

    const checkPWAStatus = async () => {
      const disabled = localStorage.getItem('pwa_debug_disabled') === 'true';
      setIsPWADisabled(disabled);
      
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const isActive = registrations.length > 0;
        setIsPWAActive(isActive);
        setSwStatus(isActive ? 'Active' : 'Inactive');
      } else {
        setSwStatus('Not Supported');
      }
    };

    checkPWAStatus();
    const interval = setInterval(checkPWAStatus, 5000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Capture console logs
  useEffect(() => {
    if (!isVisible) return;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type, args) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => {
        const newLogs = [...prev.slice(-99), { type, message, timestamp }];
        // Save to localStorage
        localStorage.setItem('admin_console_logs', JSON.stringify(newLogs));
        return newLogs;
      });
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warn', args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [isVisible]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const copyLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText);
  };

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('admin_console_logs');
  };

  const togglePWA = async () => {
    const newState = !isPWADisabled;
    
    try {
      if (newState) {
        localStorage.setItem('pwa_debug_disabled', 'true');
        
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
          }
        }
        
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (let cacheName of cacheNames) {
            await caches.delete(cacheName);
          }
        }
      } else {
        localStorage.removeItem('pwa_debug_disabled');
      }
      
      setIsPWADisabled(newState);
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      console.error('Error toggling PWA:', error);
    }
  };

  const clearPWACache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        let cleared = 0;
        for (let cacheName of cacheNames) {
          await caches.delete(cacheName);
          cleared++;
        }
        console.log(`✅ Cleared ${cleared} PWA caches`);
        alert(`✅ Cleared ${cleared} PWA cache(s)`);
      } else {
        alert('⚠️ Cache API not supported');
      }
    } catch (error) {
      console.error('Error clearing PWA cache:', error);
      alert('❌ Error clearing cache: ' + error.message);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Icon Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-4 right-4 z-[9999] bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-2.5 sm:p-3 shadow-2xl hover:scale-110 transition-transform duration-200"
          data-testid="admin-dev-tools-toggle"
          title="Developer Tools (Admin Only)"
        >
          <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" 
               style={{ display: isPWAActive ? 'block' : 'none' }} />
        </button>
      )}

      {/* Expanded Panel - Mobile Responsive */}
      {isExpanded && (
        <div className="fixed inset-x-4 bottom-4 sm:inset-auto sm:bottom-4 sm:right-4 z-[9999] sm:w-96 max-w-md bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden"
             data-testid="admin-dev-tools-panel">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-semibold text-xs sm:text-sm">Dev Tools</span>
            </div>
            <button 
              onClick={() => setIsExpanded(false)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
              data-testid="close-dev-tools"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* PWA Status & Controls */}
          <div className="p-2.5 sm:p-3 border-b border-gray-700 bg-gray-800 space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-300">PWA/SW Status:</span>
              <span className={`font-semibold px-2 py-1 rounded text-xs ${
                isPWAActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`} data-testid="pwa-status">
                {swStatus}
              </span>
            </div>
            
            {/* PWA Controls: 75% Toggle + 25% Clear */}
            <div className="flex gap-2">
              {/* 75% - PWA Toggle Button */}
              <button
                onClick={togglePWA}
                className={`flex-[3] flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-md font-semibold text-[10px] sm:text-xs transition-all ${
                  isPWADisabled 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                data-testid="toggle-pwa-btn"
              >
                {isPWADisabled ? (
                  <>
                    <ShieldOff className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">PWA Disabled</span>
                    <span className="sm:hidden">OFF</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">PWA Enabled</span>
                    <span className="sm:hidden">ON</span>
                  </>
                )}
              </button>
              
              {/* 25% - Clear Cache Button */}
              <button
                onClick={clearPWACache}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-md font-semibold text-[10px] sm:text-xs bg-orange-500 hover:bg-orange-600 text-white transition-all"
                data-testid="clear-cache-btn"
                title="Clear PWA Cache"
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Console Logs */}
          <div className="flex flex-col h-64 sm:h-80">
            <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-300">Console ({logs.length})</span>
              <div className="flex gap-1">
                <button 
                  onClick={copyLogs}
                  className="hover:bg-gray-700 p-1 sm:p-1.5 rounded transition-colors"
                  title="Copy logs"
                  data-testid="copy-logs-btn"
                >
                  <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <button 
                  onClick={clearLogs}
                  className="hover:bg-gray-700 p-1 sm:p-1.5 rounded transition-colors"
                  title="Clear logs"
                  data-testid="clear-logs-btn"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-1 bg-gray-900 font-mono text-[10px] sm:text-xs"
                 data-testid="console-logs-container">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-4 sm:py-8 text-xs">No logs yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div 
                    key={index}
                    className={`p-1.5 sm:p-2 rounded ${
                      log.type === 'error' 
                        ? 'bg-red-500/10 text-red-400 border-l-2 border-red-500' 
                        : log.type === 'warn'
                        ? 'bg-yellow-500/10 text-yellow-400 border-l-2 border-yellow-500'
                        : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    <div className="text-gray-500 text-[9px] sm:text-[10px] mb-0.5 sm:mb-1">{log.timestamp}</div>
                    <div className="break-words whitespace-pre-wrap">{log.message}</div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDevTools;
