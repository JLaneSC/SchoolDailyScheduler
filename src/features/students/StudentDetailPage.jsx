import { Link, useParams } from 'react-router-dom'

export function StudentDetailPage() {
  const { studentId } = useParams()
  return (
    <section>
      <h1>Student</h1>
      <ul>
        <li>
          <Link to={`/students/${studentId}/patterns`}>Weekly subject pattern</Link>
        </li>
        <li>
          <Link to={`/students/${studentId}/school-year`}>School year settings</Link>
        </li>
        <li>
          <Link to={`/students/${studentId}/schedule`}>Calendar</Link>
        </li>
      </ul>
    </section>
  )
}
