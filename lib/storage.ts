import type { QuizItem } from "@/types/quiz";

export interface SavedQuiz {
  id: string;
  name: string;
  items: QuizItem[];
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = "sentinelquiz";
const DB_VERSION = 1;
const STORE_NAME = "quizzes";

function openQuizDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveQuiz(items: QuizItem[], name?: string): Promise<SavedQuiz> {
  const now = new Date().toISOString();
  const quiz: SavedQuiz = {
    id: crypto.randomUUID(),
    name: name ?? `Imported Quiz ${new Date().toLocaleString()}`,
    items,
    createdAt: now,
    updatedAt: now,
  };

  const db = await openQuizDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(quiz);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  return quiz;
}

export async function loadSavedQuizzes(): Promise<SavedQuiz[]> {
  const db = await openQuizDB();
  const quizzes = await new Promise<SavedQuiz[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as SavedQuiz[]);
    request.onerror = () => reject(request.error);
  });
  db.close();

  return quizzes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function renameSavedQuiz(id: string, name: string): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const db = await openQuizDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const quiz = request.result as SavedQuiz | undefined;
      if (!quiz) {
        reject(new Error("Saved quiz not found"));
        return;
      }

      store.put({
        ...quiz,
        name: trimmedName,
        updatedAt: new Date().toISOString(),
      });
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteSavedQuiz(id: string): Promise<void> {
  const db = await openQuizDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
