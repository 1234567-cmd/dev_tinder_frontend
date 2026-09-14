import React from 'react'
import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'
import { Footer } from './Footer'
import { Toast } from './Toast'
import { BASE_URL } from '../utils/constants'
import axios from 'axios'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { addUser } from '../utils/userSlice'

export const Body = () => {
  const dispatch = useDispatch()

  const fetchUserData = async () => {
    try {
      const res= await axios.get(`${BASE_URL}/profile/view`, {
        withCredentials: true
      })
      console.log('User data fetched successfully:', res.data)
      dispatch(addUser(res.data))
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Lives here so toasts stay visible while moving between pages. */}
      <Toast />
    </div>
  )
}
