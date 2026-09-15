import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'
import { Footer } from './Footer'
import { Toast } from './Toast'
import { Loader } from './Loader'
import { BASE_URL } from '../utils/constants'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { addUser } from '../utils/userSlice'

export const Body = () => {
  const dispatch = useDispatch()
  // True until /profile/view answers, so pages don't render before we know who is logged in.
  const [checkingSession, setCheckingSession] = useState(true)

  const fetchUserData = async () => {
    try {
      const res= await axios.get(`${BASE_URL}/profile/view`, {
        withCredentials: true
      })
      console.log('User data fetched successfully:', res.data)
      dispatch(addUser(res.data))
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setCheckingSession(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        {checkingSession ? <Loader /> : <Outlet />}
      </main>
      <Footer />
      {/* Lives here so toasts stay visible while moving between pages. */}
      <Toast />
    </div>
  )
}
