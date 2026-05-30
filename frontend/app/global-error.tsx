'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-neutral-50 font-sans antialiased p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-lg font-semibold text-neutral-900">Revradar encountered an error</h1>
          <p className="text-sm text-neutral-500 mt-2">{error.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
