import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/integrations/supabase/client'

// Initialize OneSignal after user authentication
const initializeOneSignal = async () => {
  try {
    // Check for authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Listen for sign-in event
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await setupOneSignal(session.user.id);
        }
      });
      return;
    }

    // User already authenticated, initialize immediately
    await setupOneSignal(user.id);
  } catch (error) {
    console.error('OneSignal initialization error:', error);
  }
};

// Setup OneSignal with user context
const setupOneSignal = async (userId: string) => {
  try {
    // Fetch onesignal_app_id from settings table
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'onesignal_app_id')
      .single();

    if (settingsError || !settingsData?.value) {
      console.error('OneSignal App ID not found in settings:', settingsError);
      return;
    }

    const appId = settingsData.value;
    console.log('🔔 Načítám OneSignal s App ID:', appId);

    // Ensure OneSignal SDK script is loaded
    const ensureOneSignalScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.OneSignalDeferred) {
          console.log('🟢 OneSignal SDK already available');
          resolve();
          return;
        }

        // Check if script tag exists
        const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
        if (existingScript) {
          // Script tag exists, wait for it to load
          const checkInterval = setInterval(() => {
            if (window.OneSignalDeferred) {
              clearInterval(checkInterval);
              console.log('🟢 OneSignal SDK detected, initializing...');
              resolve();
            }
          }, 100);
          return;
        }

        // Dynamically inject script if not present
        console.log('📦 Loading OneSignal SDK from CDN...');
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        script.onload = () => {
          console.log('🧩 OneSignal SDK script loaded from CDN');
          // Wait a bit for SDK to initialize
          const checkInterval = setInterval(() => {
            if (window.OneSignalDeferred) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
        };
        script.onerror = () => {
          console.error('❌ Failed to load OneSignal SDK from CDN');
          reject(new Error('Failed to load OneSignal SDK'));
        };
        document.head.appendChild(script);
      });
    };

    await ensureOneSignalScript();

    // Initialize OneSignal after SDK is ready
    console.log('🛠️ Using OneSignal CDN service worker');
    await window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: 'https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: 'https://cdn.onesignal.com/sdks/OneSignalSDKUpdaterWorker.js',
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: false,
                text: {
                  action: {
                    message: "Chcete dostávat oznámení o důležitých událostech?",
                    accept: "Povolit",
                    cancel: "Ne, děkuji"
                  }
                }
              }
            ]
          }
        }
      });

      console.log('✅ OneSignal initialized with App ID:', appId);
      console.log('✅ OneSignal worker forced to CDN mode');

      // Log current Player ID if available
      const currentPlayerId = OneSignal.User.PushSubscription.id;
      if (currentPlayerId) {
        console.log('🆔 OneSignal Player ID detected:', currentPlayerId);
        
        // Save immediately to database
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const userEmail = user?.email;

          const { error } = await supabase
            .from('user_devices')
            .upsert({
              user_id: userId,
              player_id: currentPlayerId,
              device_type: 'web',
              email: userEmail,
              last_seen: new Date().toISOString()
            }, {
              onConflict: 'player_id'
            });
          
          if (error) throw error;
          console.log('✅ OneSignal player_id uložen do user_devices');
        } catch (error) {
          console.error('❌ Chyba při ukládání player_id:', error);
        }
      }

      // Check if notifications are already allowed
      const permission = await OneSignal.Notifications.permission;
      
      if (permission) {
        console.log('🔔 Už máš zapnuté notifikace');
      } else {
        // Show permission prompt
        try {
          await OneSignal.Slidedown.promptPush();
          console.log('🔔 Slidedown prompt zobrazen');
        } catch (error) {
          console.warn('Slidedown prompt nelze zobrazit:', error);
        }
      }

      // Listen for subscription changes to save player_id
      OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
        if (event.current.optedIn) {
          const playerId = OneSignal.User.PushSubscription.id;
          
          if (playerId) {
            console.log('🆔 Nový OneSignal Player ID:', playerId);
            
            try {
              // Get user email from auth
              const { data: { user } } = await supabase.auth.getUser();
              const userEmail = user?.email;

              // Insert or update record in user_devices table
              const { error } = await supabase
                .from('user_devices')
                .upsert({
                  user_id: userId,
                  player_id: playerId,
                  device_type: 'web',
                  email: userEmail,
                  last_seen: new Date().toISOString()
                }, {
                  onConflict: 'player_id'
                });
              
              if (error) throw error;
              console.log('✅ OneSignal player_id uložen do user_devices');
            } catch (error) {
              console.error('❌ Chyba při ukládání player_id:', error);
            }
          }
        }
      });
    });
  } catch (error) {
    console.error('❌ Chyba při inicializaci OneSignal:', error);
  }
};

// Initialize OneSignal after authentication check
initializeOneSignal();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
