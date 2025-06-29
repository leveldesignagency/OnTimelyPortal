export interface CalendarEventAttendee {
  email: string;
  name: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start?: Date;
  end?: Date;
  location?: string;
  attendees?: CalendarEventAttendee[];
  isAllDay?: boolean;
  recurrence?: string;
  status?: string;
  created?: Date;
  updated?: Date;
  htmlLink?: string;
  calendarId?: string;
} 