import React, { useState } from 'react'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { BASE_URL } from '../utils/constants'
import { addUser } from '../utils/userSlice'
import { showToast } from '../utils/toastSlice'
import { UserCard } from './UserCard'

export const EditProfile = ({ user }) => {
  const [firstName, setFirstName] = useState(user.firstName || '')
  const [lastName, setLastName] = useState(user.lastName || '')
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || '')
  const [age, setAge] = useState(user.age ?? '')
  const [gender, setGender] = useState(user.gender || '')
  const [about, setAbout] = useState(user.about || '')
  const [skills, setSkills] = useState((user.skills || []).join(', '))
  const [saving, setSaving] = useState(false)
  const dispatch = useDispatch()

  const skillList = skills.split(',').map((s) => s.trim()).filter(Boolean)

  const handleSave = async () => {
    setSaving(true)
    try {
      // The backend rejects an empty photoUrl or gender, so blank optional fields are left out.
      const payload = { firstName, lastName, about, skills: skillList }
      if (photoUrl) payload.photoUrl = photoUrl
      if (age !== '') payload.age = Number(age)
      if (gender) payload.gender = gender

      const res = await axios.patch(`${BASE_URL}/profile/edit`, payload, {
        withCredentials: true
      })
      // Response is { message, data: user } — same shape as /login, so NavBar keeps working.
      dispatch(addUser(res.data))
      dispatch(showToast(res.data.message || 'Profile saved successfully.'))
    } catch (err) {
      dispatch(showToast(err.response?.data?.message || 'Something went wrong. Please try again.', 'error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-center gap-10 px-4 my-10">
      <div className="card bg-base-300 w-full max-w-md shadow-sm">
        <div className="card-body">
          <h2 className="card-title justify-center text-2xl">Edit Profile</h2>

          <div className="grid grid-cols-2 gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">First Name</legend>
              <input
                type="text"
                className="input w-full"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Last Name</legend>
              <input
                type="text"
                className="input w-full"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </fieldset>
          </div>

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
                <option value="" disabled>Select</option>
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
            <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving}>
              {saving && <span className="loading loading-spinner loading-sm"></span>}
              Save Profile
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <UserCard users={[{ _id: user._id, firstName, lastName, photoUrl, age, gender }]} />
      </div>
    </div>
  )
}
