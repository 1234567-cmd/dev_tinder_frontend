import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { EditProfile } from './EditProfile'

export const Profile = () => {
  // Slice state is { user: { data: <user> } }. Body only renders pages after its session check
  // (showing a spinner until then), so no user here means nobody is logged in.
  const user = useSelector((state) => state.user.user?.data)

  if (!user) {
    return (
      <div className="flex justify-center my-10">
        <p className="text-base-content/70">
          Please <Link to="/login" className="link link-primary">log in</Link> to see your profile.
        </p>
      </div>
    )
  }

  return <EditProfile user={user} />
}
