import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addStudent,
  deleteStudent,
  getStudents,
  updateStudent,
} from './studentsApi'

const STUDENTS_QUERY_KEY = ['students']

export function useStudents() {
  const queryClient = useQueryClient()

  const studentsQuery = useQuery({
    queryKey: STUDENTS_QUERY_KEY,
    queryFn: getStudents,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY })
  }

  const addStudentMutation = useMutation({
    mutationFn: addStudent,
    onSuccess: invalidate,
  })

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, ...updates }) => updateStudent(id, updates),
    onSuccess: invalidate,
  })

  const deleteStudentMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: invalidate,
  })

  return {
    students: studentsQuery.data ?? [],
    isLoading: studentsQuery.isLoading,
    error: studentsQuery.error,
    addStudent: addStudentMutation.mutateAsync,
    updateStudent: updateStudentMutation.mutateAsync,
    deleteStudent: deleteStudentMutation.mutateAsync,
  }
}
