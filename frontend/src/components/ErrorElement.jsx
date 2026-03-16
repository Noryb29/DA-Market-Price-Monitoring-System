// pages/ErrorPage.jsx
import { useRouteError, Link } from "react-router-dom"

const ErrorElement = () => {
  const error = useRouteError()

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 text-center px-6">
      <h1 className="text-6xl font-bold text-red-500 mb-4">
        {error?.status || 404}
      </h1>

      <p className="text-lg text-gray-700 mb-2">
        {error?.statusText || "Page Not Found"}
      </p>

      <p className="text-gray-500 mb-6">
        {error?.message || "Sorry, something went wrong."}
      </p>

      <Link
        to="/"
        className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
      >
        Go Back Home
      </Link>
    </div>
  )
}

export default ErrorElement