import { useState } from 'react'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { BASE_URL } from '../utils/constants'
import { addUser } from '../utils/userSlice'
import { clearFeed } from '../utils/feedSlice'
import { showToast } from '../utils/toastSlice'
import { PasswordInput } from './PasswordInput'

export const Signup = () => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [emailId, setEmailId] = useState('')
  const [password, setPassword] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [about, setAbout] = useState('')
  const [skills, setSkills] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean)

  const handleSignup = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // The backend rejects an empty photoUrl or gender, so blank optional fields are left out.
      const payload = { firstName, lastName, emailId, password }
      if (photoUrl) payload.photoUrl = photoUrl
      if (age !== '') payload.age = Number(age)
      if (gender) payload.gender = gender
      if (about) payload.about = about
      if (skillList.length > 0) payload.skills = skillList

      // /signup sets the auth cookie and replies { message, data: user }, just like /login.
      const res = await axios.post(`${BASE_URL}/signup`, payload, {
        withCredentials: true
      })
      dispatch(addUser(res.data))
      // Drop the guest feed so /feed refetches without this user.
      dispatch(clearFeed())
      dispatch(showToast(`Welcome to DevTinder, ${res.data.data.firstName}!`))
      navigate('/feed')
    } catch (error) {
      console.error('Error signing up:', error)
      dispatch(showToast(error.response?.data?.message || 'Signup failed. Please try again.', 'error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center px-4 my-10">
      <div className="card bg-base-300 w-full max-w-md shadow-sm">
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
            <PasswordInput
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

          <div className="divider my-1 text-sm text-base-content/60">Profile details (optional)</div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Photo URL</legend>
            <input
              type="url"
              className="input w-full"
              placeholder="https://..."
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
            />
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Age</legend>
              <input
                type="number"
                min="18"
                className="input w-full"
                placeholder="18+"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Gender</legend>
              <select
                className="select w-full"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </fieldset>
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">About</legend>
            <textarea
              className="textarea w-full h-24"
              placeholder="Tell other developers about yourself"
              maxLength={500}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
            <p className="label justify-end">{about.length} / 500</p>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Skills</legend>
            <input
              type="text"
              className="input w-full"
              placeholder="React, Node.js, MongoDB"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            <p className="label">Separate skills with commas (max 10)</p>
            {skillList.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {skillList.map((skill, index) => (
                  <span key={`${skill}-${index}`} className="badge badge-primary badge-outline">{skill}</span>
                ))}
              </div>
            )}
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
