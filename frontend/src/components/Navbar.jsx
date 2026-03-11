// components/Navbar.jsx
import { Link } from "react-router-dom"

const Navbar = () => {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="text-xl font-bold text-gray-800">
            <Link to="/">Commodity Price Monitoring</Link>
          </div>

          {/* Links */}
          <div className="space-x-6 hidden md:flex">
            <Link
              to="/"
              className="text-gray-600 hover:text-black transition"
            >
              Home
            </Link>

            <Link
              to="/"
              className="text-gray-600 hover:text-black transition"
            >
              About
            </Link>

            <Link
              to="/"
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              Login
            </Link>
          </div>

        </div>
      </div>
    </nav>
  )
}

export default Navbar