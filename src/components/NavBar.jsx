import React from 'react'
import { useSelector } from 'react-redux';
import axios from 'axios';
import { BASE_URL } from '../utils/constants';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { removeUser } from '../utils/userSlice';
import { showToast } from '../utils/toastSlice';

export const NavBar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      const res= await axios.post (`${BASE_URL}/logout`, {}, { withCredentials: true });
      if (res.status === 200) {
        dispatch(removeUser());
        dispatch(showToast('Logged out successfully'));
        navigate('/login');
      }
    } catch (error) {
      console.error('Error logging out:', error);
      dispatch(showToast('Logout failed. Please try again.', 'error'));
    }
  }




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
                <Link to="/profile" className="justify-between">
                  Profile
                  <span className="badge">New</span>
                </Link>
              </li>
              <li><Link to="/connections">Connections</Link></li>
              <li><Link to="/requests">Requests</Link></li>
              <li><a onClick={handleLogout}>Logout</a></li>
            </ul>
          </div>
        )}
      </div>


    </div>
  )
}
