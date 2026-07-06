import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
} from './subjectsApi'

const SUBJECTS_QUERY_KEY = ['subjects']

export function useSubjects() {
  const queryClient = useQueryClient()

  const subjectsQuery = useQuery({
    queryKey: SUBJECTS_QUERY_KEY,
    queryFn: getSubjects,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
  }

  const addSubjectMutation = useMutation({
    mutationFn: addSubject,
    onSuccess: invalidate,
  })

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, ...updates }) => updateSubject(id, updates),
    onSuccess: invalidate,
  })

  const deleteSubjectMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: invalidate,
  })

  return {
    subjects: subjectsQuery.data ?? [],
    isLoading: subjectsQuery.isLoading,
    error: subjectsQuery.error,
    addSubject: addSubjectMutation.mutateAsync,
    updateSubject: updateSubjectMutation.mutateAsync,
    deleteSubject: deleteSubjectMutation.mutateAsync,
  }
}
