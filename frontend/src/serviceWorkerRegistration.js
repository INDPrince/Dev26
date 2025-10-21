// Service Worker Registration with Update Detection

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// Check if running on emergent.sh hostname (ONLY block on actual emergent.sh domain)
const isEmergentHostname = () => {
  const hostname = window.location.hostname;
  return hostname === 'emergent.sh' || 
         hostname.endsWith('.emergent.sh');
};

export function register(config) {
  // Check if PWA is disabled for debugging
  const isPWADisabled = localStorage.getItem('pwa_debug_disabled') === 'true';
  
  // Don't register service worker on emergent hostname OR if debug disabled
  if (isEmergentHostname() || isPWADisabled) {
    console.log('[PWA] Skipping service worker registration (emergent hostname or debug disabled)');
    return;
  }

  if ('serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        // This is running on localhost. Check if a service worker still exists.
        checkValidServiceWorker(swUrl, config);
      } else {
        // Is not localhost. Register service worker
        registerValidSW(swUrl, config);
      }
      
      // Show install prompt if not on emergent
      if (!isEmergentHostname()) {
        setupInstallPrompt();
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[PWA] Service Worker registered:', registration);

      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update();
      }, 60000);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New update available
              console.log('[PWA] New content is available; please refresh.');
              
              // Show update notification
              showUpdateNotification(registration);

              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Content is cached for offline use
              console.log('[PWA] Content is cached for offline use.');

              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[PWA] Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[PWA] No internet connection found. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Setup install prompt
function setupInstallPrompt() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Store the prompt in localStorage to show it later
    localStorage.setItem('pwa_prompt_ready', 'true');
    
    // Store prompt globally for later use
    window.deferredPWAPrompt = deferredPrompt;
    
    // Dispatch custom event that can be listened to on any page
    window.dispatchEvent(new CustomEvent('pwa-installable'));
    
    console.log('[PWA] Install prompt is ready');
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    localStorage.removeItem('pwa_prompt_ready');
    deferredPrompt = null;
    window.deferredPWAPrompt = null;
  });
}

// Show install banner
function showInstallBanner(deferredPrompt) {
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.innerHTML = `
    <div class="pwa-install-container">
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">📱 Install App</div>
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">Install QuizMaster for offline access</div>
        
        <!-- Progress Bar (hidden initially) -->
        <div id="install-progress-container" style="display: none; margin-top: 8px;">
          <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;">Installing...</div>
          <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
            <div id="install-progress-bar" style="width: 0%; height: 100%; background: white; transition: width 0.3s ease;"></div>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 8px; width: 100%;">
        <button id="pwa-install-btn" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          flex: 1;
          transition: transform 0.2s;
        ">Install</button>
        <button id="pwa-dismiss-btn" style="
          background: transparent;
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          flex: 1;
          transition: transform 0.2s;
        ">Later</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .pwa-install-container {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(200px);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 18px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 10000;
      max-width: 90%;
      width: 360px;
      animation: elasticSlideUp 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    }
    
    @keyframes elasticSlideUp {
      0% { 
        transform: translateX(-50%) translateY(200px); 
        opacity: 0;
        scale: 0.8;
      }
      50% {
        transform: translateX(-50%) translateY(-20px);
        scale: 1.05;
      }
      65% {
        transform: translateX(-50%) translateY(5px);
        scale: 0.98;
      }
      80% {
        transform: translateX(-50%) translateY(-5px);
        scale: 1.01;
      }
      100% { 
        transform: translateX(-50%) translateY(0); 
        opacity: 1;
        scale: 1;
      }
    }
    
    #pwa-install-btn:hover, #pwa-dismiss-btn:hover {
      transform: scale(1.05);
    }
    
    @media (max-width: 640px) {
      .pwa-install-container {
        width: calc(100vw - 24px) !important;
        padding: 12px 16px !important;
        bottom: 16px !important;
        left: 12px !important;
        right: 12px !important;
        transform: translateX(0) translateY(200px) !important;
        animation: elasticSlideUpMobile 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
      }
      
      @keyframes elasticSlideUpMobile {
        0% { 
          transform: translateX(0) translateY(200px); 
          opacity: 0;
          scale: 0.8;
        }
        50% {
          transform: translateX(0) translateY(-20px);
          scale: 1.05;
        }
        65% {
          transform: translateX(0) translateY(5px);
          scale: 0.98;
        }
        80% {
          transform: translateX(0) translateY(-5px);
          scale: 1.01;
        }
        100% { 
          transform: translateX(0) translateY(0); 
          opacity: 1;
          scale: 1;
        }
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(banner);

  // Install button click
  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // Show progress bar
    const progressContainer = document.getElementById('install-progress-container');
    const progressBar = document.getElementById('install-progress-bar');
    progressContainer.style.display = 'block';
    
    // Animate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      progressBar.style.width = progress + '%';
      if (progress >= 90) clearInterval(progressInterval);
    }, 100);
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    
    // Complete progress
    progressBar.style.width = '100%';
    clearInterval(progressInterval);
    
    setTimeout(() => {
      banner.remove();
    }, 500);
    
    deferredPrompt = null;
  });

  // Dismiss button click
  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    banner.remove();
  });
}

// Show update notification
function showUpdateNotification(registration) {
  const notification = document.createElement('div');
  notification.id = 'pwa-update-notification';
  notification.innerHTML = `
    <div class="pwa-update-container">
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">🎉 New Update Available!</div>
      <div style="font-size: 12px; opacity: 0.95; margin-bottom: 8px;">A new version is ready. Refresh to update.</div>
      
      <!-- Progress Bar (hidden initially) -->
      <div id="update-progress-container" style="display: none; margin-bottom: 10px;">
        <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;">Updating...</div>
        <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
          <div id="update-progress-bar" style="width: 0%; height: 100%; background: white; transition: width 0.3s ease;"></div>
        </div>
      </div>
      
      <div style="display: flex; gap: 8px;">
        <button id="pwa-update-btn" style="
          background: white;
          color: #f5576c;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 12px;
          flex: 1;
          transition: transform 0.2s;
        ">Update Now</button>
        <button id="pwa-later-btn" style="
          background: transparent;
          color: white;
          border: 1px solid rgba(255,255,255,0.4);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          transition: transform 0.2s;
        ">Later</button>
      </div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .pwa-update-container {
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 14px 18px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 10000;
      width: 340px;
      max-width: 90vw;
      transform: translateX(400px);
      animation: elasticSlideInRight 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    }
    
    @keyframes elasticSlideInRight {
      0% { 
        transform: translateX(400px); 
        opacity: 0;
        scale: 0.8;
      }
      50% {
        transform: translateX(-15px);
        scale: 1.05;
      }
      65% {
        transform: translateX(5px);
        scale: 0.98;
      }
      80% {
        transform: translateX(-3px);
        scale: 1.01;
      }
      100% { 
        transform: translateX(0); 
        opacity: 1;
        scale: 1;
      }
    }
    
    #pwa-update-btn:hover, #pwa-later-btn:hover {
      transform: scale(1.05);
    }
    
    @media (max-width: 640px) {
      .pwa-update-container {
        top: 16px !important;
        right: 12px !important;
        left: 12px !important;
        width: calc(100vw - 24px) !important;
        padding: 12px 16px !important;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);

  // Update button click
  document.getElementById('pwa-update-btn').addEventListener('click', () => {
    // Show progress bar
    const progressContainer = document.getElementById('update-progress-container');
    const progressBar = document.getElementById('update-progress-bar');
    progressContainer.style.display = 'block';
    
    // Animate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 15;
      progressBar.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(progressInterval);
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    }, 100);
  });

  // Later button click
  document.getElementById('pwa-later-btn').addEventListener('click', () => {
    notification.remove();
  });

  // Auto-update after 15 seconds if user doesn't interact
  setTimeout(() => {
    if (document.getElementById('pwa-update-notification')) {
      const progressContainer = document.getElementById('update-progress-container');
      const progressBar = document.getElementById('update-progress-bar');
      
      if (progressContainer && progressContainer.style.display === 'none') {
        progressContainer.style.display = 'block';
        
        let progress = 0;
        const autoProgressInterval = setInterval(() => {
          progress += 20;
          progressBar.style.width = progress + '%';
          if (progress >= 100) {
            clearInterval(autoProgressInterval);
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            window.location.reload();
          }
        }, 100);
      }
    }
  }, 15000);
}
