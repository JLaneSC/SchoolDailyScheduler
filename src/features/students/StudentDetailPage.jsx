import { useParams } from 'react-router-dom'

export function StudentDetailPage() {
  const { studentId } = useParams()
  return (
    <section>
      <h1>Student detail</h1>
      <p>Coming in a future milestone (student id: {studentId}).</p>
    </section>
  )
}
