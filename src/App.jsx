import { Link, Route, Routes } from 'react-router-dom'
import { StudentsPage } from './features/students/StudentsPage'
import { StudentDetailPage } from './features/students/StudentDetailPage'
import { SubjectsPage } from './features/subjects/SubjectsPage'
import { SupplyListPage } from './features/supplyList/SupplyListPage'
import { GradeBandsPage } from './features/gradeBands/GradeBandsPage'
import { StandardsPage } from './features/standards/StandardsPage'
import { CurriculumPlanPage } from './features/curriculumPlan/CurriculumPlanPage'
import { StandardDistributionPage } from './features/standardDistribution/StandardDistributionPage'
import { CurriculumGenerationPage } from './features/curriculumGeneration/CurriculumGenerationPage'
import { SubjectPatternsPage } from './features/schedule/SubjectPatternsPage'
import { SchoolYearPage } from './features/schedule/SchoolYearPage'
import { CalendarPage, CalendarRedirect } from './features/schedule/CalendarPage'
import { DayDetailPage } from './features/schedule/DayDetailPage'
import { SettingsPage } from './features/settings/SettingsPage'
import './styles/App.css'

function App() {
  return (
    <>
      <nav>
        <Link to="/">Students</Link>
        <Link to="/subjects">Subjects</Link>
        <Link to="/supply-list">Supply List</Link>
        <Link to="/grade-bands">Grade Bands</Link>
        <Link to="/standards">Standards</Link>
        <Link to="/settings">Settings</Link>
      </nav>

      <Routes>
        <Route path="/" element={<StudentsPage />} />
        <Route path="/students/:studentId" element={<StudentDetailPage />} />
        <Route path="/students/:studentId/patterns" element={<SubjectPatternsPage />} />
        <Route path="/students/:studentId/school-year" element={<SchoolYearPage />} />
        <Route path="/students/:studentId/schedule" element={<CalendarRedirect />} />
        <Route
          path="/students/:studentId/curriculum-plan"
          element={<CurriculumPlanPage />}
        />
        <Route
          path="/students/:studentId/curriculum-plan/generate"
          element={<CurriculumGenerationPage />}
        />
        <Route
          path="/students/:studentId/standard-distribution"
          element={<StandardDistributionPage />}
        />
        <Route
          path="/students/:studentId/schedule/:year/:month"
          element={<CalendarPage />}
        />
        <Route
          path="/students/:studentId/schedule/:year/:month/:day"
          element={<DayDetailPage />}
        />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/supply-list" element={<SupplyListPage />} />
        <Route path="/grade-bands" element={<GradeBandsPage />} />
        <Route path="/standards" element={<StandardsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </>
  )
}

export default App
