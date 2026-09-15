import { useEffect, useState } from 'react'
import axios from 'axios'
import { useSelector, useDispatch } from 'react-redux'
import { BASE_URL } from '../utils/constants'
import { setFeed } from '../utils/feedSlice'
import { showToast } from '../utils/toastSlice'
import { UserCard } from './UserCard'
import { Loader } from './Loader'

export const Feed = () => {
  const feed = useSelector((state) => state.feed.feed);
  const dispatch = useDispatch();
  // No spinner when the feed is already in the store from an earlier visit.
  const [loading, setLoading] = useState(feed.length === 0);

  const getFeed = async () => {
    if (feed.length > 0) return;
    try {
      const res = await axios.get(`${BASE_URL}/feed`, {
        withCredentials: true
      });
      // Response is { feed, page, limit, total, totalPages } — store only the users.
      dispatch(setFeed(res.data.feed));
    } catch (error) {
      console.error('Error fetching feed:', error);
      dispatch(showToast('Could not load your feed. Please try again.', 'error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFeed();
  }, []);

  if (loading) {
    return <Loader />
  }

  if (feed.length === 0) {
    return (
      <div className="flex justify-center my-10">
        <p className="text-base-content/70">No new users in your feed.</p>
      </div>
    )
  }

  return (
    <div className="flex justify-center my-10">
      <UserCard users={feed} />
    </div>
  )
}
