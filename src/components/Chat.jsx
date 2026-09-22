import React, { useEffect } from 'react'
import axios from 'axios'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { BASE_URL } from '../utils/constants'
import { createSocketConnection } from '../utils/socket'
import { showToast } from '../utils/toastSlice'

// Adds messages that aren't already shown, so a message arriving twice is only rendered once.
const mergeMessages = (current, incoming) => {
  const seen = new Set(current.map((message) => message._id))
  return [...current, ...incoming.filter((message) => !seen.has(message._id))]
}

// Time only for today's messages, date and time for older ones.
const formatSentAt = (createdAt) => {
  const date = new Date(createdAt)
  const time = { hour: '2-digit', minute: '2-digit' }
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString([], time)
    : date.toLocaleString([], { month: 'short', day: 'numeric', ...time })
}

const Avatar = ({ url, fallback, alt }) => (
  <div className="avatar placeholder">
    <div className="w-10 rounded-full bg-base-300 text-base-content">
      {url
        ? <img src={url} alt={alt} className="h-full w-full rounded-full object-cover" />
        : <span className="flex h-full w-full items-center justify-center text-xs font-bold">{fallback}</span>}
    </div>
  </div>
)

export const Chat = () => {
  const { targetUserId } = useParams()
  const location = useLocation()
  const dispatch = useDispatch()
  const loggedInUser = useSelector((state) => state.user.user?.data)

  const [messages, setMessages] = React.useState([])
  const [fetchedTargetUser, setFetchedTargetUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [chatError, setChatError] = React.useState('')
  const [connected, setConnected] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const socketRef = React.useRef(null)
  const bottomRef = React.useRef(null)

  // Connections hands the card over on click; on a refresh or direct visit the history request supplies it.
  const targetUser = location.state?.targetUser ?? fetchedTargetUser
  const firstName = targetUser?.firstName ?? 'User'
  const lastName = targetUser?.lastName ?? ''
  const photoUrl = targetUser?.photoUrl

  // State is only set inside the promise callbacks, so nothing updates synchronously within the effect.
  useEffect(() => {
    axios.get(`${BASE_URL}/chat/${targetUserId}`, { withCredentials: true })
      .then((res) => {
        setFetchedTargetUser(res.data.targetUser)
        // Keep anything that came in over the socket while the history was loading.
        setMessages((prev) => mergeMessages(res.data.messages || [], prev))
      })
      .catch((error) => {
        console.error('Error fetching chat:', error)
        setChatError(error.response?.data?.message || 'Could not load this chat. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [targetUserId])

  useEffect(() => {
    const socket = createSocketConnection()
    socketRef.current = socket

    // Fires again after every reconnect, and a reconnected socket has to rejoin its room.
    socket.on('connect', () => {
      socket.emit('joinChat', { targetUserId }, (res) => {
        if (res?.error) {
          setChatError(res.error)
          return
        }
        setConnected(true)
      })
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', (error) => {
      console.error('Chat connection error:', error.message)
      setConnected(false)
    })
    socket.on('messageReceived', (message) => {
      setMessages((prev) => mergeMessages(prev, [message]))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [targetUserId])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e) => {
    e.preventDefault()
    const text = draft.trim()
    const socket = socketRef.current
    if (!text || sending || !socket) return

    setSending(true)
    // The server replies with the saved message; the timeout stops a lost connection leaving it stuck.
    socket.timeout(5000).emit('sendMessage', { targetUserId, text }, (err, res) => {
      setSending(false)
      if (err || res?.error) {
        dispatch(showToast(res?.error || 'Message could not be sent. Please try again.', 'error'))
        return
      }
      setMessages((prev) => mergeMessages(prev, [res.message]))
      setDraft('')
    })
  }

  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
  const myInitials = `${loggedInUser?.firstName?.[0] ?? ''}${loggedInUser?.lastName?.[0] ?? ''}`.toUpperCase()
  const canSend = connected && !chatError

  return (
    <div className="mx-auto my-10 w-full max-w-3xl px-4">
      <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl bg-base-100 shadow-lg ring-1 ring-base-300">

        <div className="flex items-center gap-3 border-b border-base-300 bg-base-200 px-4 py-3">
          <Link to="/connections" className="btn btn-ghost btn-sm btn-circle" aria-label="Back to connections">←</Link>
          <Avatar url={photoUrl} fallback={initials} alt={`${firstName}'s profile photo`} />
          <div className="min-w-0">
            <h2 className="truncate font-bold">{firstName} {lastName}</h2>
            {!chatError && (
              <p className="text-xs text-base-content/60">{connected ? 'Connected' : 'Connecting…'}</p>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          )}
          {!loading && chatError && (
            <p className="flex h-full items-center justify-center text-center text-base-content/70">{chatError}</p>
          )}
          {!loading && !chatError && messages.length === 0 && (
            <p className="flex h-full items-center justify-center text-center text-base-content/70">
              No messages yet. Say hi to {firstName} 👋
            </p>
          )}
          {!chatError && messages.map((message) => {
            const fromSelf = message.senderId === loggedInUser?._id
            return (
              <div key={message._id} className={`chat ${fromSelf ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-image">
                  {fromSelf
                    ? <Avatar url={loggedInUser?.photoUrl} fallback={myInitials} alt="Your profile photo" />
                    : <Avatar url={photoUrl} fallback={initials} alt={`${firstName}'s profile photo`} />}
                </div>
                <div className="chat-header text-xs opacity-60">
                  {fromSelf ? 'You' : firstName}
                  <time className="ml-1" dateTime={message.createdAt}>{formatSentAt(message.createdAt)}</time>
                </div>
                <div className={`chat-bubble whitespace-pre-wrap wrap-break-word ${fromSelf ? 'chat-bubble-primary' : ''}`}>
                  {message.text}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-2 border-t border-base-300 bg-base-200 px-4 py-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${firstName}...`}
            maxLength={1000}
            disabled={!!chatError}
            className="input input-bordered flex-1 rounded-full"
          />
          <button type="submit" className="btn btn-primary rounded-full" disabled={!draft.trim() || !canSend || sending}>
            {sending && <span className="loading loading-spinner loading-xs"></span>}
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat
