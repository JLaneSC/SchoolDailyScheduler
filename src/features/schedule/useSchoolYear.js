import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSchoolYear, saveSchoolYear } from './schoolYearsApi'

export function useSchoolYear(studentId) {
  const queryClient = useQueryClient()
  const queryKey = ['schoolYear', studentId]

  const schoolYearQuery = useQuery({
    queryKey,
    queryFn: () => getSchoolYear(studentId),
    enabled: Boolean(studentId),
  })

  const saveSchoolYearMutation = useMutation({
    mutationFn: saveSchoolYear,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
    },
  })

  return {
    schoolYear: schoolYearQuery.data ?? null,
    isLoading: schoolYearQuery.isLoading,
    error: schoolYearQuery.error,
    saveSchoolYear: saveSchoolYearMutation.mutateAsync,
  }
}
