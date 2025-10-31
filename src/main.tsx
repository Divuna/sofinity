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
    // TODO: Fetch onesignal_app_id from Supabase settings table
    // For now using existing app ID
    const appId = "5e5539e1-fc71-4c4d-9fef-414293d83dbb";

    await window.OneSignalDeferred?.push(async (OneSignal) => {
      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
      });

      // Listen for subscription changes to save player_id
      OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
        if (event.current.optedIn) {
          const playerId = OneSignal.User.PushSubscription.id;
          
          if (playerId) {
            try {
              // Insert or update record in user_devices table
              const { error } = await supabase.rpc('save_player_id' as any, {
                p_user_id: userId,
                p_player_id: playerId,
                p_device_type: 'web'
              });
              
              if (error) throw error;
              console.log('✅ OneSignal player_id registered in user_devices');
            } catch (error) {
              console.error('Failed to save player_id to user_devices:', error);
            }
          }
        }
      });
    });
  } catch (error) {
    console.error('OneSignal setup error:', error);
  }
};

// Initialize OneSignal after authentication check
initializeOneSignal();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
