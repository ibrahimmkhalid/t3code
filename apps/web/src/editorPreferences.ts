import { EDITORS, EditorId, NativeApi, type AvailableTerminalEditor } from "@t3tools/contracts";
import { Schema } from "effect";
import { getLocalStorageItem, setLocalStorageItem, useLocalStorage } from "./hooks/useLocalStorage";
import { useCallback, useMemo } from "react";

const LAST_EDITOR_KEY = "t3code:last-editor";

export function usePreferredEditor(availableEditors: ReadonlyArray<EditorId>) {
  const [lastEditor, setLastEditor] = useLocalStorage(LAST_EDITOR_KEY, null, EditorId);

  const effectiveEditor = useMemo(() => {
    if (lastEditor && availableEditors.includes(lastEditor)) return lastEditor;
    return EDITORS.find((editor) => availableEditors.includes(editor.id))?.id ?? null;
  }, [lastEditor, availableEditors]);

  return [effectiveEditor, setLastEditor] as const;
}

export function resolveAndPersistPreferredEditor(
  availableEditors: readonly EditorId[],
): EditorId | null {
  const availableEditorIds = new Set(availableEditors);
  const stored = getLocalStorageItem(LAST_EDITOR_KEY, EditorId);
  if (stored && availableEditorIds.has(stored)) return stored;
  const editor = EDITORS.find((editor) => availableEditorIds.has(editor.id))?.id ?? null;
  if (editor) setLocalStorageItem(LAST_EDITOR_KEY, editor, EditorId);
  return editor ?? null;
}

const LAST_TERMINAL_EDITOR_KEY = "t3code:last-terminal-editor";

export function usePreferredTerminalEditor(
  availableTerminalEditors: ReadonlyArray<AvailableTerminalEditor>,
): readonly [string | null, (id: string) => void] {
  const [lastId, setLastId] = useLocalStorage(
    LAST_TERMINAL_EDITOR_KEY,
    null,
    Schema.NullOr(Schema.String),
  );
  const effectiveId = useMemo(() => {
    if (lastId && availableTerminalEditors.some((e) => e.id === lastId)) return lastId;
    return availableTerminalEditors[0]?.id ?? null;
  }, [lastId, availableTerminalEditors]);
  const setTerminalEditor = useCallback((id: string) => setLastId(id), [setLastId]);
  return [effectiveId, setTerminalEditor] as const;
}

export async function openInPreferredEditor(api: NativeApi, targetPath: string): Promise<EditorId> {
  const { availableEditors } = await api.server.getConfig();
  const editor = resolveAndPersistPreferredEditor(availableEditors);
  if (!editor) throw new Error("No available editors found.");
  await api.shell.openInEditor(targetPath, editor);
  return editor;
}
