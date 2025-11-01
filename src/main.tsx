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
    console.log('🔔 Inicializuji OneSignal s App ID:', appId);

    await window.OneSignalDeferred?.push(async (OneSignal) => {
      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: true,
                text: {
                  actionMessage: "Chcete dostávat oznámení o důležitých událostech?",
                  acceptButton: "Povolit",
                  cancelButton: "Ne, děkuji"
                }
              }
            ]
          }
        }
      });

      console.log('✅ OneSignal SDK inicializován s českými texty');

      // Show permission prompt
      try {
        await OneSignal.Slidedown.promptPush();
        console.log('🔔 Slidedown prompt zobrazen');
      } catch (error) {
        console.warn('Slidedown prompt nelze zobrazit:', error);
      }

      // Log current Player ID if available
      const currentPlayerId = OneSignal.User.PushSubscription.id;
      if (currentPlayerId) {
        console.log('🆔 OneSignal Player ID:', currentPlayerId);
      }

      // Listen for subscription changes to save player_id
      OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
        if (event.current.optedIn) {
          const playerId = OneSignal.User.PushSubscription.id;
          
          if (playerId) {
            console.log('🆔 Nový OneSignal Player ID:', playerId);
            
            try {
              // Insert or update record in user_devices table
              const { error } = await supabase.rpc('save_player_id' as any, {
                p_user_id: userId,
                p_player_id: playerId,
                p_device_type: 'web'
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
