import { useQuery } from '@tanstack/react-query'
import { getScheduleEntriesForMonth } from './scheduleEntriesApi'

export function useScheduleEntries(studentId, year, month) {
  const query = useQuery({
    queryKey: ['scheduleEntries', studentId, year, month],
    queryFn: () => getScheduleEntriesForMonth(studentId, year, month),
    enabled: Boolean(studentId && year && month),
  })

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
