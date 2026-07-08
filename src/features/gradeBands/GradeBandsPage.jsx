import { useGradeBands } from './useGradeBands'
import { GradeBandForm } from './GradeBandForm'
import { GradeBandListItem } from './GradeBandListItem'

export function GradeBandsPage() {
  const {
    gradeBands,
    isLoading,
    error,
    addGradeBand,
    updateGradeBand,
    deleteGradeBand,
  } = useGradeBands()

  return (
    <section>
      <h1>Grade bands</h1>
      <p>
        Grade bands (e.g. Grade 1, K-2, Middle Level) group standards by
        which students they apply to. They&rsquo;re usually created
        automatically while ingesting a standards document, but you can add,
        rename, or clean up duplicates here.
      </p>

      <h2>Add a grade band</h2>
      <GradeBandForm onSubmit={addGradeBand} />

      <h2>Your grade bands</h2>
      {isLoading && <p>Loading grade bands...</p>}
      {error && <p role="alert">Could not load grade bands: {error.message}</p>}
      {!isLoading && !error && gradeBands.length === 0 && <p>No grade bands yet.</p>}

      <ul>
        {gradeBands.map((gradeBand) => (
          <GradeBandListItem
            key={gradeBand.id}
            gradeBand={gradeBand}
            onUpdate={updateGradeBand}
            onDelete={deleteGradeBand}
          />
        ))}
      </ul>
    </section>
  )
}
