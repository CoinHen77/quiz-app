import { db } from './firebase'
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import type { Quiz, Question } from './firebase'

const COL = 'quizzes'

export async function listQuizzes(): Promise<Quiz[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz))
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Quiz
}

export async function createQuiz(data: { title: string; questions: Question[] }): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function saveQuiz(id: string, data: { title: string; questions: Question[] }): Promise<void> {
  await updateDoc(doc(db, COL, id), data)
}

export async function deleteQuiz(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
