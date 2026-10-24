export type Priority = 'alta' | 'media' | 'baja'
export type TaskStatus = 'pendiente' | 'progreso' | 'revision' | 'entregada'
export type TaskType =
  | 'tarea'
  | 'practica'
  | 'ensayo'
  | 'proyecto'
  | 'examen'
  | 'quiz'
  | 'lectura'
  | 'exposicion'

export interface Meeting {
  day: number
  start: string
  end: string
  room: string
  professor: string
}

export interface Course {
  id: string
  code: string
  name: string
  professor: string
  credits: number
  room: string
  color: string
  semester: string
  meetings: Meeting[]
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  courseId: string
  title: string
  description: string
  link: string
  type: TaskType
  priority: Priority
  status: TaskStatus
  dueAt: string
  weight: number
  estimateMin: number
  checklist: ChecklistItem[]
  createdAt: string
  completedAt?: string
}

export interface FocusSession {
  id: string
  minutes: number
  taskId: string | null
  at: string
}

export interface Settings {
  studentName: string
  career: string
  campus: string
  term: string
  notifyDays: number
  browserNotify: boolean
  theme: 'light' | 'dark'
  seenAlertIds: string[]
}

export interface AppState {
  courses: Course[]
  tasks: Task[]
  sessions: FocusSession[]
  settings: Settings
}
