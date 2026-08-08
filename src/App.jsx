import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Layout from './components/Layout'
import Timesheet from './pages/Timesheet'
import Employees from './pages/Employees'
import HolidayReport from './pages/HolidayReport'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [page, setPage] = useState('timesheet')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="center-loading">Loading…</div>
  }

  if (!session) {
    return <Login />
  }

  return (
    <Layout page={page} setPage={setPage} userEmail={session.user.email}>
      {page === 'timesheet' && <Timesheet />}
      {page === 'employees' && <Employees />}
      {page === 'holiday' && <HolidayReport />}
    </Layout>
  )
}
