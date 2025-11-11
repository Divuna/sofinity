import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/integrations/supabase/client'

// ✅ 1. Globální injekce OneSignal SDK při startu aplikace
if (!document.querySelector('script[src*="OneSignalSDK.page.js"]')) {
  const script = document.createElement('script')
  script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
  script.defer = true
  script.onload = () => console.log('🚀 OneSignal SDK script injected globally')
  document.head.appendChild(script)
}

// ✅ 2. Inicializace OneSignal po autentizaci
const initializeOneSignal = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Pokud není přihlášený, čekáme na SIGNED_IN event
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await setupOneSignal(session.user.id)
        }
      })
      return
    }

    // Pokud už je přihlášený, rovnou inicializujeme
    await setupOneSignal(user.id)
  } catch (error) {
    console.error('OneSignal initialization error:', error)
  }
}

// ✅ 3. Funkce pro nastavení OneSignal a uložení player_id
const setupOneSignal = async (userId: string) => {
  try {
    // Fetch OneSignal App ID from Edge Function (reads from Edge Function secrets)
    const { data, error } = await supabase.functions.invoke('get-onesignal-config')

    if (error || !data?.success || !data?.appId) {
      console.error('OneSignal App ID not found in Edge Function secrets:', error)
      return
    }

    const appId = data.appId
    console.log('🔔 Načítám OneSignal s App ID:', appId)

    // Zajištění, že SDK je načtené
    const ensureOneSignalScript = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.OneSignalDeferred) {
          console.log('🟢 OneSignal SDK already available')
          resolve()
          return
        }

        const existingScript = document.querySelector('script[src*="OneSignalSDK"]')
        if (existingScript) {
          const checkInterval = setInterval(() => {
            if (window.OneSignalDeferred) {
              clearInterval(checkInterval)
              console.log('🟢 OneSignal SDK detected, initializing...')
              resolve()
            }
          }, 100)
          return
        }

        console.error('❌ OneSignal SDK script not found in DOM')
        reject(new Error('OneSignal SDK not loaded'))
      })
    }

    await ensureOneSignalScript()

    console.log('🛠️ Using OneSignal CDN service worker')

    // Inicializace OneSignal
    await window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: 'https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: 'https://cdn.onesignal.com/sdks/OneSignalSDKUpdaterWorker.js',
        serviceWorkerParam: { scope: '/' },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: 'push',
                autoPrompt: false,
                text: {
                  action: {
                    message: 'Chcete dostávat oznámení o důležitých událostech?',
                    accept: 'Povolit',
                    cancel: 'Ne, děkuji'
                  }
                }
              }
            ]
          }
        }
      })

      console.log('✅ OneSignal initialized with App ID:', appId)

      // Pokus o okamžité získání player_id
      const currentPlayerId = OneSignal.User.PushSubscription.id
      if (currentPlayerId) {
        console.log('🆔 OneSignal Player ID detected:', currentPlayerId)
        await savePlayerId(userId, currentPlayerId)
      }

      // Zkontroluj oprávnění k notifikacím
      const permission = await OneSignal.Notifications.permission
      if (permission) {
        console.log('🔔 Uživatel už má povolené notifikace')
      } else {
        try {
          await OneSignal.Slidedown.promptPush()
          console.log('🔔 Slidedown prompt zobrazen')
        } catch (error) {
          console.warn('Slidedown prompt nelze zobrazit:', error)
        }
      }

      // Sleduj změnu přihlášení k odběru (nový player_id)
      OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
        if (event.current.optedIn) {
          const playerId = OneSignal.User.PushSubscription.id
          if (playerId) {
            console.log('🆔 Nový OneSignal Player ID:', playerId)
            await savePlayerId(userId, playerId)
          }
        }
      })
    })
  } catch (error) {
    console.error('❌ Chyba při inicializaci OneSignal:', error)
  }
}

// ✅ 4. Pomocná funkce pro ukládání player_id
const savePlayerId = async (userId: string, playerId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email

    const { error } = await supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        player_id: playerId,
        device_type: 'web',
        email: userEmail,
        last_seen: new Date().toISOString()
      }, { onConflict: 'player_id' })

    if (error) throw error
    console.log('✅ OneSignal player_id uložen do user_devices')
  } catch (error) {
    console.error('❌ Chyba při ukládání player_id:', error)
  }
}

// ✅ 5. Spuštění inicializace
initializeOneSignal()

// ✅ 6. Render aplikace
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
