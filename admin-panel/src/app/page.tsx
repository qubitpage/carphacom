import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AppRoot() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('admin_session')
  
  if (!sessionCookie) {
    redirect('/login')  // basePath adds /app automatically
  }
  
  try {
    const sessionData = JSON.parse(sessionCookie.value)
    if (sessionData.userId && sessionData.email) {
      redirect('/dashboard')  // basePath adds /app automatically
    }
  } catch {
    redirect('/login')
  }
  
  redirect('/login')
}
