'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const DEMOS = [
  { href: '/', label: 'Places' },
  { href: '/restaurants', label: 'Restaurants' },
  { href: '/brands', label: 'Brands' },
  { href: '/divisions', label: 'Divisions' },
  { href: '/buildings', label: 'Buildings' },
  { href: '/site-selection', label: 'Site Selection' },
]

export default function NavBar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-12">
        <div className="flex items-center gap-2 min-w-0">
          <a href="https://overturemapsapi.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 whitespace-nowrap text-sm sm:text-base">
            Overture Maps API <span className="text-blue-600">Demos</span>
          </a>
        </div>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-1">
          {DEMOS.map((demo) => {
            const active = pathname === demo.href
            return (
              <Link
                key={demo.href}
                href={demo.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {demo.label}
              </Link>
            )
          })}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden pb-3 flex flex-col gap-1">
          {DEMOS.map((demo) => {
            const active = pathname === demo.href
            return (
              <Link
                key={demo.href}
                href={demo.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  active ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {demo.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
