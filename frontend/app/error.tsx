'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-lg font-semibold text-neutral-900">Something went wrong</h1>
        <p className="text-sm text-neutral-500 mt-2">
          Revradar hit an unexpected error. Try refreshing the page.
        </p>
        <div className="flex gap-2 justify-center mt-6">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="secondary" onClick={() => window.location.href = '/dashboard'}>
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
