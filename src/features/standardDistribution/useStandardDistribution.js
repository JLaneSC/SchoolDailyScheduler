import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveLinks, getLinks, rejectLinks } from './scheduleEntryStandardsApi'

export function useStandardDistribution({ studentId, subjectId, year, month, status } = {}) {
  const queryClient = useQueryClient()
  const queryKey = ['scheduleEntryStandards', { studentId, subjectId, year, month, status }]

  const linksQuery = useQuery({
    queryKey,
    queryFn: () => getLinks({ studentId, subjectId, year, month, status }),
    enabled: Boolean(studentId && subjectId && year && month),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['scheduleEntryStandards'] })
  }

  const approveLinksMutation = useMutation({
    mutationFn: approveLinks,
    onSuccess: invalidate,
  })

  const rejectLinksMutation = useMutation({
    mutationFn: rejectLinks,
    onSuccess: invalidate,
  })

  return {
    links: linksQuery.data ?? [],
    isLoading: linksQuery.isLoading,
    error: linksQuery.error,
    approveLinks: approveLinksMutation.mutateAsync,
    rejectLinks: rejectLinksMutation.mutateAsync,
  }
}
