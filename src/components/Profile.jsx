import React from 'react'
import { useSelector } from 'react-redux'
import { EditProfile } from './EditProfile'

export const Profile = () => {
  // Slice state is { user: { data: <user> } }. Body fetches it on load, so wait for it
  // before rendering the form — the form's inputs start from these values.
  const user = useSelector((state) => state.user.user?.data)

  if (!user) {
    return (
      <div className="flex justify-center my-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return <EditProfile user={user} />
}
