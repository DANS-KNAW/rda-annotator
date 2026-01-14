import { Outlet } from 'react-router'
import Navigation from './Navigation'
import { Topbar } from './Topbar'

export default function Layout() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex-none">
        <Topbar />
        <Navigation />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
