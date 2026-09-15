import React from 'react'
import axios from 'axios';
import { BASE_URL } from '../utils/constants';


export const Connections = () => {
  const [connections, setConnections] = React.useState([])

  const getConnections = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/user/connections`, { withCredentials: true });
      console.log('Connections fetched:', res.data.connections);
      setConnections(res.data.connections || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  }

  React.useEffect(() => {
    getConnections();
  }, []);

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 my-16 text-center">
        <h1 className="text-2xl font-bold">No connections yet</h1>
        <p className="text-base-content/70">When someone accepts your request, they'll show up here.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto my-10 w-full max-w-6xl px-4">
      <div className="mb-6 flex items-center justify-center gap-3">
        <h1 className="text-3xl font-bold">Connections</h1>
        <span className="badge badge-primary">{connections.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {connections.map((connection) => {
          const { _id, firstName, lastName, photoUrl, age, gender, about, skills } = connection
          const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()

          return (
            <div
              key={_id}
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

              {(about || skills?.length > 0) && (
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
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Connections
