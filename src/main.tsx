import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/integrations/supabase/client'

// Initialize OneSignal
const initializeOneSignal = async () => {
  try {
    await window.OneSignalDeferred?.push(async (OneSignal) => {
      await OneSignal.init({
        appId: "357be038-dbaf-4551-9a16-96d9897197a3",
        allowLocalhostAsSecureOrigin: true,
      });

      // Listen for subscription changes
      OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
        if (event.current.optedIn) {
          const userId = OneSignal.User.PushSubscription.id;
          
          // Get current authenticated user
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user && userId) {
            try {
              // Call save_player_id RPC function
              const { error } = await supabase.rpc('save_player_id' as any, {
                p_user_id: user.id,
                p_player_id: userId,
                p_device_type: 'web'
              });
              
              if (error) throw error;
              console.log('✅ OneSignal player_id saved to Supabase');
            } catch (error) {
              console.error('Failed to save player_id:', error);
            }
          }
        }
      });
    });
  } catch (error) {
    console.error('OneSignal initialization error:', error);
  }
};

// Initialize OneSignal before rendering
initializeOneSignal();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
