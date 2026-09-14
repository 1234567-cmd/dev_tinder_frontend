import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { removeToast } from '../utils/toastSlice'

// Full class names (not `alert-${type}`) so Tailwind can find them when building the CSS.
// `path` is the icon drawn inside the white circle.
const TOAST_STYLE = {
  success: { alert: 'alert-success', icon: 'text-success', path: 'M5 12.5l4.5 4.5L19 7.5' },
  error: { alert: 'alert-error', icon: 'text-error', path: 'M7 7l10 10M17 7L7 17' },
  warning: { alert: 'alert-warning', icon: 'text-warning', path: 'M12 6v7M12 17.5v.5' },
  info: { alert: 'alert-info', icon: 'text-info', path: 'M12 11v6.5M12 6.5v.5' }
}

export const Toast = () => {
  const toasts = useSelector((state) => state.toast.toasts)
  const dispatch = useDispatch()

  if (toasts.length === 0) return null

  return (
    <div className="toast toast-top toast-center z-50">
      {toasts.map((toast) => {
        const style = TOAST_STYLE[toast.type] ?? TOAST_STYLE.info
        return (
          <div
            key={toast.id}
            role="alert"
            className={`alert ${style.alert} w-72 max-w-[90vw] gap-3 px-3 py-2 text-sm whitespace-normal shadow-lg`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ${style.icon}`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d={style.path} />
              </svg>
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => dispatch(removeToast(toast.id))}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
