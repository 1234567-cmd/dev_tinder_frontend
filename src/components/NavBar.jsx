import React from 'react'
import { useSelector } from 'react-redux';

export const NavBar = () => {

  // Slice state is { user: { data: <user> } } — both /login and /profile/view wrap the user in `data`.
  const user = useSelector((state) => state.user.user?.data);
  return (
    <div className="navbar bg-base-300 shadow-sm">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">DevTinder</a>
      </div>
      <div className="flex items-center gap-3 mr-5">
        {user && (
          <p className="hidden sm:block text-base text-base-content/70">
            Welcome, <span className="font-semibold text-base-content">{user.firstName}</span>
          </p>
        )}
        {user && (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-base-300">
                <img
                  alt={`${user.firstName}'s profile photo`}
                  src={user.photoUrl} />
              </div>
            </div>
            <ul
              tabIndex={-1}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              <li>
                <a className="justify-between">
                  Profile
                  <span className="badge">New</span>
                </a>
              </li>
              <li><a>Settings</a></li>
              <li><a>Logout</a></li>
            </ul>
          </div>
        )}
      </div>


    </div>
  )
}
