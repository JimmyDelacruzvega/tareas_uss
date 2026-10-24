import type { Course } from '../types.ts'

export interface UpcomingClass {
  course: Course
  start: string
  end: string
  when: Date
  room: string
}

export function upcomingClasses(courses: Course[], from = new Date(), days = 8): UpcomingClass[] {
  const results: UpcomingClass[] = []
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(from)
    date.setDate(from.getDate() + offset)
    for (const course of courses) {
      for (const meeting of course.meetings) {
        if (meeting.day !== date.getDay()) continue
        const [hours, minutes] = meeting.start.split(':').map(Number)
        const when = new Date(date)
        when.setHours(hours || 0, minutes || 0, 0, 0)
        if (when.getTime() < from.getTime() - 60_000) continue
        results.push({
          course,
          start: meeting.start,
          end: meeting.end,
          when,
          room: meeting.room || course.room,
        })
      }
    }
  }
  return results.sort((a, b) => a.when.getTime() - b.when.getTime())
}

export function classesOnDate(courses: Course[], date: Date) {
  return courses
    .flatMap((course) =>
      course.meetings
        .filter((meeting) => meeting.day === date.getDay())
        .map((meeting) => ({ course, meeting })),
    )
    .sort((a, b) => a.meeting.start.localeCompare(b.meeting.start))
}
