export default function RouteLoadingFallback() {
  return (
    <section className="route-loading" aria-live="polite" aria-busy="true">
      <div className="route-loading-mark" />
      <p>Loading page</p>
    </section>
  )
}
