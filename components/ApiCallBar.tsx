'use client'

import { useState } from 'react'
import type { RequestInfo } from '@/lib/overture'

interface ApiCallBarProps {
  request: RequestInfo | null
  isDemo: boolean
}

/**
 * Shows the API request behind the current map, ready to copy as curl.
 * The explorer's job is to show what the API returns; this is the bridge
 * from "that's useful" to "here's how I get it in my own code".
 */
export default function ApiCallBar({ request, isDemo }: ApiCallBarProps) {
  const [copied, setCopied] = useState(false)
  if (!request) return null

  const url = new URL(request.url)
  const shown = `${url.pathname}${url.search}`
  const keyForCurl = isDemo ? 'DEMO-API-KEY' : 'YOUR-API-KEY'
  const curl = `curl -H "x-api-key: ${keyForCurl}" "${request.url}"`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(curl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: the URL is still visible to select by hand */
    }
  }

  return (
    <div className="bg-slate-900 text-slate-100 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3">
        <span className="font-semibold text-slate-300 shrink-0">API call</span>
        <code className="truncate flex-1 font-mono" title={shown}>GET {shown}</code>
        {request.fromCache && <span className="text-slate-400 shrink-0">cached, no request used</span>}
        <button
          onClick={copy}
          className="shrink-0 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {copied ? 'Copied' : 'Copy as curl'}
        </button>
        <a
          href="https://www.overturemapsapi.com/docs/api-endpoints/places"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-blue-300 hover:text-blue-200 underline"
        >
          Docs
        </a>
      </div>
    </div>
  )
}
