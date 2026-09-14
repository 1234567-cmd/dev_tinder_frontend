import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { removeToast } from '../utils/toastSlice'

// Full class names (not `alert-${type}`) so Tailwind can find them when building the CSS.
const ALERT_CLASS = {
  success: 'alert-success',
  error: 'alert-error',
  info: 'alert-info',
  warning: 'alert-warning'
}

export const Toast = () => {
  const toasts = useSelector((state) => state.toast.toasts)
  const dispatch = useDispatch()

  if (toasts.length === 0) return null

  return (
    <div className="toast toast-top toast-center z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`alert ${ALERT_CLASS[toast.type] ?? 'alert-info'} shadow-lg`}
        >
          <span>{toast.message}</span>
          <button
            className="btn btn-ghost btn-xs btn-circle"
            onClick={() => dispatch(removeToast(toast.id))}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
