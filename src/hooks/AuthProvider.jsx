import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function ensureSession() {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        if (isMounted) {
          setSession(data.session)
          setReady(true)
        }
        return
      }

      const { data: signInData, error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error('Anonymous sign-in failed:', error.message)
      }
      if (isMounted) {
        setSession(signInData?.session ?? null)
        setReady(true)
      }
    }

    ensureSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (!ready) {
    return <p>Loading...</p>
  }

  return (
    <AuthContext.Provider value={{ session }}>{children}</AuthContext.Provider>
  )
}
