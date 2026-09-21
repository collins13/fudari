export default function Loading() {
  return (
    <div className="container py-5">
      <div className="text-center py-5" role="status" aria-live="polite">
        <div className="spinner-border text-primary" aria-hidden="true"></div>
        <p className="text-muted mt-3 mb-0">Loading...</p>
      </div>
    </div>
  );
}
