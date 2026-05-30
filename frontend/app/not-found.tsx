import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="max-w-md w-full text-center">
        <p className="text-4xl font-semibold text-neutral-900 tabular-nums">404</p>
        <h1 className="text-lg font-semibold text-neutral-900 mt-2">Page not found</h1>
        <p className="text-sm text-neutral-500 mt-2">
          This page doesn&apos;t exist or may have been moved.
        </p>
        <Link href="/dashboard" className="inline-block mt-6">
          <Button>Back to dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
