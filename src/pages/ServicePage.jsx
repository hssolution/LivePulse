import { useParams } from 'react-router-dom'

export default function ServicePage() {
  const { slug } = useParams()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Service Page</h1>
        <p className="text-lg text-gray-600">
          Viewing service for: <span className="font-semibold text-blue-600">{slug}</span>
        </p>
        <p className="mt-4 text-sm text-gray-500">
          (This page will be customized by the partner in the admin panel)
        </p>
      </div>
    </div>
  )
}
