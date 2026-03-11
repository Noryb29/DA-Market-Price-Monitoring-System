import React from 'react'
import { createBrowserRouter } from 'react-router-dom'
import Layout from './Layout.jsx'
import App from './App.jsx'
import ErrorElement from './components/ErrorElement.jsx'

const router = createBrowserRouter([
    {
        path : '/',
        element: <Layout/>,
        errorElement:<ErrorElement/>,
        children: [
            { index: true,element:<App/> }
        ]
    }
])

export default router;