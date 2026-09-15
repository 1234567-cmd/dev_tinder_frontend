import { useState } from 'react'

// Password field with an eye button that shows/hides what was typed.
// Any other props (value, onChange, placeholder, required, minLength...) go straight to the <input>.
export const PasswordInput = (inputProps) => {
  const [visible, setVisible] = useState(false)

  return (
    <label className="input w-full">
      <input {...inputProps} type={visible ? 'text' : 'password'} className="grow" />
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-circle -mr-1"
        onClick={() => setVisible((v) => !v)}
        // Keep focus (and the cursor position) in the input when the button is clicked.
        onMouseDown={(e) => e.preventDefault()}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 opacity-70"
          aria-hidden="true"
        >
          {visible ? (
            // Eye with a slash: click to hide.
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <path d="M1 1l22 22" />
            </>
          ) : (
            // Open eye: click to show.
            <>
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </label>
  )
}
