import React from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'

// UI only for now — messages live in component state, no API calls yet.
const dummyMessages = [
  { _id: 'm1', fromSelf: false, text: 'Hey! Thanks for connecting 👋', sentAt: '10:02 AM' },
  { _id: 'm2', fromSelf: true, text: 'Hi! Happy to connect. What are you building these days?', sentAt: '10:04 AM' },
  { _id: 'm3', fromSelf: false, text: 'A MERN side project. You?', sentAt: '10:05 AM' },
]

export const Chat = () => {
  const { targetUserId } = useParams()
  const location = useLocation()
  const loggedInUser = useSelector((state) => state.user.user?.data)

  // Connections hands the card over on click; direct visits fall back to a placeholder.
  const targetUser = location.state?.targetUser
  const firstName = targetUser?.firstName ?? 'User'
  const lastName = targetUser?.lastName ?? ''
  const photoUrl = targetUser?.photoUrl

  const [messages, setMessages] = React.useState(dummyMessages)
  const [draft, setDraft] = React.useState('')
  const bottomRef = React.useRef(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return

    setMessages((prev) => [
      ...prev,
      {
        _id: `local-${Date.now()}`,
        fromSelf: true,
        text,
        sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setDraft('')
  }

  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  const myInitials = `${loggedInUser?.firstName?.[0] ?? ''}${loggedInUser?.lastName?.[0] ?? ''}`.toUpperCase()

  const Avatar = ({ url, fallback, alt }) => (
    <div className="avatar placeholder">
      <div className="w-10 rounded-full bg-base-300 text-base-content">
        {url
          ? <img src={url} alt={alt} className="h-full w-full rounded-full object-cover" />
          : <span className="flex h-full w-full items-center justify-center text-xs font-bold">{fallback}</span>}
      </div>
    </div>
  )

  return (
    <div className="mx-auto my-10 w-full max-w-3xl px-4">
      <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl bg-base-100 shadow-lg ring-1 ring-base-300">

        <div className="flex items-center gap-3 border-b border-base-300 bg-base-200 px-4 py-3">
          <Link to="/connections" className="btn btn-ghost btn-sm btn-circle" aria-label="Back to connections">←</Link>
          <Avatar url={photoUrl} fallback={initials} alt={`${firstName}'s profile photo`} />
          <div className="min-w-0">
            <h2 className="truncate font-bold">{firstName} {lastName}</h2>
            <p className="text-xs text-base-content/60">{targetUserId}</p>
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <div key={message._id} className={`chat ${message.fromSelf ? 'chat-end' : 'chat-start'}`}>
              <div className="chat-image">
                {message.fromSelf
                  ? <Avatar url={loggedInUser?.photoUrl} fallback={myInitials} alt="Your profile photo" />
                  : <Avatar url={photoUrl} fallback={initials} alt={`${firstName}'s profile photo`} />}
              </div>
              <div className="chat-header text-xs opacity-60">
                {message.fromSelf ? 'You' : firstName}
                <time className="ml-1">{message.sentAt}</time>
              </div>
              <div className={`chat-bubble ${message.fromSelf ? 'chat-bubble-primary' : ''}`}>
                {message.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-2 border-t border-base-300 bg-base-200 px-4 py-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${firstName}...`}
            className="input input-bordered flex-1 rounded-full"
          />
          <button type="submit" className="btn btn-primary rounded-full" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat
