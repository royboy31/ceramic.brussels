/**
 * The document open in the Structure editor, for the top bar's Preview.
 *
 * The navbar cannot tell which document is being edited: the router knows
 * pane ids, not documents. The "Open preview" document action is rendered
 * for the open document anyway, so it reports it here (OpenPreviewAction.tsx).
 *
 * Clicking Preview unmounts the editor a moment before the Preview tool
 * mounts, so a document that has only just closed still counts; one closed
 * earlier does not, or Preview would open a page the editor left long ago.
 */

interface Current {
  id: string;
  type: string;
  doc: Record<string, any>;
  leftAt: number | null;
}

let current: Current | null = null;

/** How long after its pane closed a document still counts as the one being edited. */
const GRACE_MS = 3000;

export function reportOpen(id: string, type: string, doc: Record<string, any>): void {
  current = { id, type, doc, leftAt: null };
}

export function reportClosed(id: string): void {
  if (current?.id === id) current = { ...current, leftAt: Date.now() };
}

export function currentDocument(): Current | null {
  if (!current) return null;
  if (current.leftAt !== null && Date.now() - current.leftAt > GRACE_MS) return null;
  return current;
}
