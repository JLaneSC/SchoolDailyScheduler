import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addSupplyItem,
  deleteSupplyItem,
  getSupplyItems,
  updateSupplyItem,
} from './supplyItemsApi'

const SUPPLY_ITEMS_QUERY_KEY = ['supplyItems']

export function useSupplyItems() {
  const queryClient = useQueryClient()

  const supplyItemsQuery = useQuery({
    queryKey: SUPPLY_ITEMS_QUERY_KEY,
    queryFn: getSupplyItems,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: SUPPLY_ITEMS_QUERY_KEY })
  }

  const addSupplyItemMutation = useMutation({
    mutationFn: addSupplyItem,
    onSuccess: invalidate,
  })

  const updateSupplyItemMutation = useMutation({
    mutationFn: ({ id, ...updates }) => updateSupplyItem(id, updates),
    onSuccess: invalidate,
  })

  const deleteSupplyItemMutation = useMutation({
    mutationFn: deleteSupplyItem,
    onSuccess: invalidate,
  })

  return {
    supplyItems: supplyItemsQuery.data ?? [],
    isLoading: supplyItemsQuery.isLoading,
    error: supplyItemsQuery.error,
    addSupplyItem: addSupplyItemMutation.mutateAsync,
    updateSupplyItem: updateSupplyItemMutation.mutateAsync,
    deleteSupplyItem: deleteSupplyItemMutation.mutateAsync,
  }
}
