function toErrorMessage(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "Unknown error";
}

export async function runBulkDelete<T>(
  items: T[],
  deleteItem: (item: T) => Promise<unknown>
) {
  const results = await Promise.allSettled(items.map((item) => deleteItem(item)));
  const successCount = results.filter((result) => result.status === "fulfilled").length;
  const failureCount = results.length - successCount;
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => toErrorMessage(result.reason));

  return {
    successCount,
    failureCount,
    errors,
  };
}
