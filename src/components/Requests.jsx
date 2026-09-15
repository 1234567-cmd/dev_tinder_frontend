import React from 'react'
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { BASE_URL } from '../utils/constants';
import { showToast } from '../utils/toastSlice';


export const Requests = () => {
  const [requests, setRequests] = React.useState([])
  const dispatch = useDispatch();

  const getRequests = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/user/requests/received`, { withCredentials: true });
      setRequests(res.data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      dispatch(showToast('Could not load your requests. Please try again.', 'error'));
    }
  }

  const reviewRequest = async (status, requestId) => {
    try {
      await axios.post(`${BASE_URL}/request/review/${status}/${requestId}`, {}, { withCredentials: true });
      setRequests((prev) => prev.filter((request) => request._id !== requestId));
      dispatch(showToast(status === 'accepted' ? 'Request accepted' : 'Request rejected'));
    } catch (error) {
      console.error('Error reviewing request:', error);
      dispatch(showToast('Could not update the request. Please try again.', 'error'));
    }
  }

  React.useEffect(() => {
    getRequests();
  }, []);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 my-16 text-center">
        <h1 className="text-2xl font-bold">No requests yet</h1>
        <p className="text-base-content/70">When someone is interested in you, they'll show up here.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto my-10 w-full max-w-6xl px-4">
      <div className="mb-6 flex items-center justify-center gap-3">
        <h1 className="text-3xl font-bold">Requests Received</h1>
        <span className="badge badge-primary">{requests.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {requests.map((request) => {
          // Skip requests whose sender account no longer exists.
          if (!request.fromUserId) return null
          const { firstName, lastName, photoUrl, age, gender, about, skills } = request.fromUserId
          const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()

          return (
            <div
              key={request._id}
              className="card overflow-hidden rounded-2xl bg-base-100 shadow-lg ring-1 ring-base-300 transition duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              <figure className="relative h-72 bg-base-200">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={`${firstName}'s profile photo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-6xl font-bold text-base-content/40">{initials}</span>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-4 pt-12 pb-4 text-white">
                  <h2 className="text-xl font-bold">
                    {firstName} {lastName}
                    {age && <span className="font-normal">, {age}</span>}
                  </h2>
                  {gender && <p className="text-sm capitalize opacity-80">{gender}</p>}
                </div>
              </figure>

              <div className="card-body gap-3 p-4">
                {about && <p className="line-clamp-2 text-sm text-base-content/80">{about}</p>}
                {skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="badge badge-outline badge-sm">{skill}</span>
                    ))}
                    {skills.length > 4 && (
                      <span className="badge badge-ghost badge-sm">+{skills.length - 4}</span>
                    )}
                  </div>
                )}

                <div className="card-actions flex-nowrap justify-center gap-3">
                  <button
                    className="btn btn-outline btn-error flex-1 rounded-full"
                    onClick={() => reviewRequest('rejected', request._id)}
                  >
                    ✕ Reject
                  </button>
                  <button
                    className="btn btn-success flex-1 rounded-full"
                    onClick={() => reviewRequest('accepted', request._id)}
                  >
                    ✓ Accept
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Requests
