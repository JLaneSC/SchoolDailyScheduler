import { Link, Route, Routes } from 'react-router-dom'
import { StudentsPage } from './features/students/StudentsPage'
import { StudentDetailPage } from './features/students/StudentDetailPage'
import { SettingsPage } from './features/settings/SettingsPage'
import './styles/App.css'

function App() {
  return (
    <>
      <nav>
        <Link to="/">Students</Link>
        <Link to="/settings">Settings</Link>
      </nav>

      <Routes>
        <Route path="/" element={<StudentsPage />} />
        <Route path="/students/:studentId" element={<StudentDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </>
  )
}

export default App
