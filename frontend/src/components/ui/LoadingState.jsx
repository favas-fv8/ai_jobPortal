export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="loading-state">
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p>{message}</p>
    </div>
  )
}
