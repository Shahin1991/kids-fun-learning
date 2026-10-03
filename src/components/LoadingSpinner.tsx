export function LoadingSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex items-center justify-center p-8">
      <div className="h-12 w-12 animate-spin rounded-full border-8 border-kid-blue border-t-transparent" />
    </div>
  );
}
