/** The Worker rejects any API body above 4 MB (`MAX_API_BODY_BYTES`). A file
 *  the app is about to send is checked first so the user learns the limit
 *  before a slow upload instead of after a 413. */
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;

export const isOversizedImport = (file: File) => file.size > MAX_IMPORT_BYTES;
