import { useState } from 'react'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { BASE_URL } from '../utils/constants'
import { addUser } from '../utils/userSlice'
import { showToast } from '../utils/toastSlice'

export const Signup = () => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [emailId, setEmailId] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSignup = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await axios.post(`${BASE_URL}/signup`, {
        firstName,
        lastName,
        emailId,
        password
      }, {
        withCredentials: true
      })

      // /signup doesn't set the auth cookie, so log in with the same credentials right away.
      const res = await axios.post(`${BASE_URL}/login`, { emailId, password }, {
        withCredentials: true
      })
      dispatch(addUser(res.data))
      dispatch(showToast(`Welcome to DevTinder, ${res.data.data.firstName}!`))
      // New accounts have no photo, age or skills yet — send them to fill those in.
      navigate('/profile')
    } catch (error) {
      console.error('Error signing up:', error)
      // /signup replies with plain text; /login replies with { message }.
      const data = error.response?.data
      const message = typeof data === 'string' && data ? data : data?.message
      dispatch(showToast(message || 'Signup failed. Please try again.', 'error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center my-10">
      <div className="card bg-base-300 w-96 shadow-sm">
        <form className="card-body" onSubmit={handleSignup}>
          <h2 className="card-title justify-center text-2xl">Sign Up</h2>

          <div className="grid grid-cols-2 gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">First Name</legend>
              <input
                type="text"
                className="input w-full"
                placeholder="First name"
                required
                minLength={2}
                maxLength={50}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Last Name</legend>
              <input
                type="text"
                className="input w-full"
                placeholder="Last name"
                required
                minLength={2}
                maxLength={50}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </fieldset>
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Email ID</legend>
            <input
              type="email"
              className="input w-full"
              placeholder="Enter your email"
              required
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Password</legend>
            <input
              type="password"
              className="input w-full"
              placeholder="Create a password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="label whitespace-normal">
              At least 8 characters with uppercase, lowercase, a number and a symbol
            </p>
          </fieldset>

          <div className="card-actions justify-center mt-4">
            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              {submitting && <span className="loading loading-spinner loading-sm"></span>}
              Sign Up
            </button>
          </div>

          <p className="text-center text-sm mt-2">
            Already have an account?{' '}
            <Link to="/login" className="link link-primary">Login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
