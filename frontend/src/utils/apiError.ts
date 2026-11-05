/** The backend's message when there is one — axios only gives us
 *  "Request failed with status code 400", which tells the user nothing. */
export const apiErrorMessage = (error: unknown) => {
  const backendMessage = (error as { response?: { data?: { error?: { message?: unknown } } } })
    ?.response?.data?.error?.message;
  if (typeof backendMessage === "string" && backendMessage.trim()) {
    return backendMessage.trim();
  }
  return error instanceof Error ? error.message : String(error);
};
