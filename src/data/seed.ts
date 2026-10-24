import type { AppState, Course, Meeting, Settings } from '../types.ts'

export function defaultSettings(): Settings {
  return {
    studentName: '',
    career: 'Ingeniería de Sistemas e Informática',
    campus: 'USS · Chiclayo',
    term: '2026-II',
    notifyDays: 3,
    browserNotify: false,
    theme: 'light',
    seenAlertIds: [],
  }
}

function course(
  id: string,
  code: string,
  name: string,
  color: string,
  meetings: Meeting[],
): Course {
  return {
    id,
    code,
    name,
    professor: meetings.find((meeting) => meeting.professor)?.professor ?? '',
    credits: 0,
    room: meetings.find((meeting) => meeting.room)?.room ?? '',
    color,
    semester: '2026-II',
    meetings,
  }
}

function block(day: number, start: string, end: string, room: string, professor: string): Meeting {
  return { day, start, end, room, professor }
}

export function seedState(): AppState {
  const courses: Course[] = [
    course('c-tutoria', 'TUT-I', 'Tutoría I', '#4f46e5', [
      block(2, '08:00', '08:50', 'A-204 (Sede Chiclayo)', 'Bustamante Marquez, Luz Cesarina'),
      block(2, '08:50', '10:30', 'A-204 (Sede Chiclayo)', 'Bustamante Marquez, Luz Cesarina'),
    ]),
    course('c-mate', 'MAT-BAS', 'Matemática Básica para Ingeniería', '#f97316', [
      block(2, '13:50', '17:10', 'A-301 (Sede Chiclayo)', 'Torres Bravo, Edwing Augusto'),
    ]),
    course('c-plm', 'PLM', 'Pensamiento Lógico Matemático', '#0891b2', [
      block(3, '08:00', '11:20', 'A-201 (Sede Chiclayo)', 'Castro Castro, Miguel Angel'),
    ]),
    course('c-com', 'COM', 'Comunicación', '#e11d48', [
      block(3, '13:50', '16:20', 'A-201 (Sede Chiclayo)', 'Arizaga Olaya de Menendez, Yessica Eunissi'),
      block(3, '16:20', '18:00', 'A-201 (Sede Chiclayo)', 'Arizaga Olaya de Menendez, Yessica Eunissi'),
    ]),
    course('c-inv', 'INV', 'Iniciación a la Investigación', '#7c3aed', [
      block(3, '18:00', '19:40', 'Clases virtuales (Sede Chiclayo)', 'Callejas Torres, Juan Carlos'),
      block(3, '19:40', '21:20', 'Clases virtuales (Sede Chiclayo)', 'Rivas Manay, Roberth Manuel'),
    ]),
    course('c-iis', 'IIS', 'Introducción a la Ingeniería de Sistemas e Informática', '#059669', [
      block(4, '08:00', '09:40', 'Laboratorio Computo 02 (Sede Chiclayo)', 'Tuesta Monteza, Victor Alexci'),
      block(4, '09:40', '11:20', 'Laboratorio Computo 02 (Sede Chiclayo)', 'Tuesta Monteza, Victor Alexci'),
    ]),
  ]

  return {
    courses,
    tasks: [],
    sessions: [],
    settings: defaultSettings(),
  }
}
