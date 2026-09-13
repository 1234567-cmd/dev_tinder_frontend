import React from 'react'

export const Footer = () => {
  return (
    <footer className="footer footer-horizontal footer-center bg-base-300 text-base-content rounded p-10">
  
      <aside>
        <p className="text-lg font-bold">DevTinder</p>
        <p className="opacity-70">Where developers match on code, not looks.</p>
        <p className="mt-2 text-sm opacity-60">
          Copyright &copy; {new Date().getFullYear()} &mdash; Built with &hearts; by Waseem Nasir
        </p>
      </aside>
    </footer>
  )
}
