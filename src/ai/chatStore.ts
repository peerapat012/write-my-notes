import { isExpired, type Chat } from './chat'

// Chats live in the browser's IndexedDB, not in the notes folder: they are not notes, and they must not end up in git.

function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open('write-my-notes-chat', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('chats', { keyPath: 'id' })
    open.onerror = () => reject(open.error)
    open.onsuccess = () => resolve(open.result)
  })
}

async function run<T>(mode: IDBTransactionMode, use: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await db()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = use(database.transaction('chats', mode).objectStore('chats'))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    database.close()
  }
}

export const chatStore = {
  all: () => run<Chat[]>('readonly', (s) => s.getAll()),
  put: (chat: Chat) => run('readwrite', (s) => s.put(chat)).then(() => undefined),
  delete: (id: string) => run('readwrite', (s) => s.delete(id)).then(() => undefined),
}

/** Chats of one notes folder from the last 7 days, newest first. */
export async function recentChats(vaultId: string) {
  return (await chatStore.all()).filter((c) => c.vault === vaultId && !isExpired(c)).sort((a, b) => b.updated - a.updated)
}
