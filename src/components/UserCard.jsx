import React from 'react'

export const UserCard = ({ users }) => {
  // scrollIntoView instead of href="#slideX" so the page doesn't jump and the URL doesn't change.
  const goToSlide = (index) => {
    document.getElementById(`slide${index}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start'
    })
  }

  return (
    <div className="carousel w-80">
      {users.map((user, index) => {
        const { _id, firstName, lastName, photoUrl, age, gender } = user
        const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
        const prev = (index - 1 + users.length) % users.length
        const next = (index + 1) % users.length

        return (
          // Padding keeps the card's shadow from being clipped by the carousel's scroll area.
          <div key={_id} id={`slide${index}`} className="carousel-item w-full p-2">
            <div className="card w-full overflow-hidden rounded-2xl bg-base-100 shadow-lg ring-1 ring-base-300">
              <figure className="relative h-96 bg-base-200">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={`${firstName}'s profile photo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-6xl font-bold text-base-content/40">{initials}</span>
                )}

                {users.length > 1 && (
                  <span className="badge absolute top-3 right-3 border-none bg-black/50 text-white">
                    {index + 1} / {users.length}
                  </span>
                )}

                {users.length > 1 && (
                  <div className="absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
                    <button
                      className="btn btn-circle btn-sm border-none bg-black/40 text-white hover:bg-black/60"
                      onClick={() => goToSlide(prev)}
                      aria-label="Previous user"
                    >
                      ❮
                    </button>
                    <button
                      className="btn btn-circle btn-sm border-none bg-black/40 text-white hover:bg-black/60"
                      onClick={() => goToSlide(next)}
                      aria-label="Next user"
                    >
                      ❯
                    </button>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-4 pt-12 pb-4 text-white">
                  <h2 className="text-2xl font-bold">
                    {firstName} {lastName}
                    {age && <span className="font-normal">, {age}</span>}
                  </h2>
                  {gender && <p className="text-sm capitalize opacity-80">{gender}</p>}
                </div>
              </figure>

              <div className="card-body p-4">
                <div className="card-actions flex-nowrap justify-center gap-3">
                  <button className="btn btn-outline btn-error flex-1 rounded-full">✕ Ignore</button>
                  <button className="btn btn-success flex-1 rounded-full">♥ Interested</button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
