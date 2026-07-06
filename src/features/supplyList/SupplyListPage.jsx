import { useSupplyItems } from './useSupplyItems'
import { SupplyItemForm } from './SupplyItemForm'
import { SupplyItemListItem } from './SupplyItemListItem'

export function SupplyListPage() {
  const {
    supplyItems,
    isLoading,
    error,
    addSupplyItem,
    updateSupplyItem,
    deleteSupplyItem,
  } = useSupplyItems()

  return (
    <section>
      <h1>Supply list</h1>

      <h2>Add an item</h2>
      <SupplyItemForm onSubmit={addSupplyItem} />

      <h2>Your supplies</h2>
      {isLoading && <p>Loading supplies...</p>}
      {error && <p role="alert">Could not load supplies: {error.message}</p>}
      {!isLoading && !error && supplyItems.length === 0 && <p>No supplies yet.</p>}

      <ul>
        {supplyItems.map((item) => (
          <SupplyItemListItem
            key={item.id}
            item={item}
            onUpdate={updateSupplyItem}
            onDelete={deleteSupplyItem}
          />
        ))}
      </ul>
    </section>
  )
}
