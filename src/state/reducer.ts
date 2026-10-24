import { seedState } from '../data/seed.ts'
import type { AppState, Course, FocusSession, Settings, Task, TaskStatus } from '../types.ts'

export type Action =
  | { type: 'add-course'; course: Course }
  | { type: 'update-course'; course: Course }
  | { type: 'delete-course'; id: string }
  | { type: 'add-task'; task: Task }
  | { type: 'update-task'; task: Task }
  | { type: 'delete-task'; id: string }
  | { type: 'set-status'; id: string; status: TaskStatus }
  | { type: 'toggle-check'; taskId: string; itemId: string }
  | { type: 'add-check'; taskId: string; itemId: string; text: string }
  | { type: 'remove-check'; taskId: string; itemId: string }
  | { type: 'patch-settings'; patch: Partial<Settings> }
  | { type: 'see-alerts'; ids: string[] }
  | { type: 'add-session'; session: FocusSession }
  | { type: 'reset-demo'; keep: Settings }
  | { type: 'replace'; state: AppState }
  | { type: 'hydrate'; courses: Course[]; tasks: Task[]; sessions: FocusSession[] }

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add-course':
      return { ...state, courses: [...state.courses, action.course] }
    case 'update-course':
      return {
        ...state,
        courses: state.courses.map((course) => (course.id === action.course.id ? action.course : course)),
      }
    case 'delete-course':
      return {
        ...state,
        courses: state.courses.filter((course) => course.id !== action.id),
        tasks: state.tasks.filter((task) => task.courseId !== action.id),
      }
    case 'add-task':
      return { ...state, tasks: [action.task, ...state.tasks] }
    case 'update-task':
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.task.id ? action.task : task)),
      }
    case 'delete-task':
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) }
    case 'set-status':
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id !== action.id) return task
          return {
            ...task,
            status: action.status,
            completedAt: action.status === 'entregada' ? new Date().toISOString() : undefined,
          }
        }),
      }
    case 'toggle-check':
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id !== action.taskId) return task
          return {
            ...task,
            checklist: task.checklist.map((item) =>
              item.id === action.itemId ? { ...item, done: !item.done } : item,
            ),
          }
        }),
      }
    case 'add-check':
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id !== action.taskId) return task
          return {
            ...task,
            checklist: [...task.checklist, { id: action.itemId, text: action.text, done: false }],
          }
        }),
      }
    case 'remove-check':
      return {
        ...state,
        tasks: state.tasks.map((task) => {
          if (task.id !== action.taskId) return task
          return {
            ...task,
            checklist: task.checklist.filter((item) => item.id !== action.itemId),
          }
        }),
      }
    case 'patch-settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'see-alerts': {
      const seenAlertIds = Array.from(new Set([...state.settings.seenAlertIds, ...action.ids])).slice(-400)
      return { ...state, settings: { ...state.settings, seenAlertIds } }
    }
    case 'add-session':
      return { ...state, sessions: [action.session, ...state.sessions].slice(0, 80) }
    case 'reset-demo': {
      const fresh = seedState()
      return {
        ...fresh,
        settings: {
          ...fresh.settings,
          studentName: action.keep.studentName,
          career: action.keep.career,
          campus: action.keep.campus,
          term: action.keep.term,
          notifyDays: action.keep.notifyDays,
          browserNotify: action.keep.browserNotify,
          theme: action.keep.theme,
        },
      }
    }
    case 'replace':
      return action.state
    case 'hydrate':
      return { ...state, courses: action.courses, tasks: action.tasks, sessions: action.sessions }
    default: {
      const unexpected: never = action
      void unexpected
      return state
    }
  }
}
