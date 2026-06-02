export interface EventTemplate {
  id: string;
  title: string;
  emoji: string;
  color: string;
  category: string;
  reminder: string;
  description?: string;
  image?: any; // ← YE ADD KARO

}

export interface TemplateCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  templates: EventTemplate[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'work',
    name: 'Work & Meeting',
    emoji: '💼',
    color: '#3157B7',
    templates: [
      { id: 'meeting', title: 'Team Meeting', emoji: '🤝', color: '#3157B7', category: 'work', reminder: '15min'},
      { id: 'call', title: 'Client Call', emoji: '📞', color: '#2196F3', category: 'work', reminder: '10min'},
      { id: 'deadline', title: 'Project Deadline', emoji: '⏰', color: '#FF5722', category: 'work', reminder: '1day'},
      { id: 'presentation', title: 'Presentation', emoji: '📊', color: '#9C27B0', category: 'work', reminder: '30min'},
      { id: 'interview', title: 'Interview', emoji: '👔', color: '#00BCD4', category: 'work', reminder: '1hour'},
    ],
  },
  {
    id: 'birthday',
    name: 'Birthday & Anniversary',
    emoji: '🎂',
    color: '#E91E63',
    templates: [
      { id: 'birthday', title: 'Birthday', emoji: '🎂', color: '#E91E63', category: 'birthday', reminder: 'on_day_9am' },
      { id: 'anniversary', title: 'Anniversary', emoji: '💍', color: '#FF4081', category: 'birthday', reminder: 'on_day_9am' },
      { id: 'wedding', title: 'Wedding', emoji: '💒', color: '#F48FB1', category: 'birthday', reminder: '1week_before_9am' },
      { id: 'graduation', title: 'Graduation', emoji: '🎓', color: '#CE93D8', category: 'birthday', reminder: 'on_day_9am' },
    ],
  },
  {
    id: 'health',
    name: 'Health & Medical',
    emoji: '🏥',
    color: '#10970B',
    templates: [
      { id: 'doctor', title: 'Doctor Appointment', emoji: '🩺', color: '#10970B', category: 'health', reminder: '1hour' },
      { id: 'dentist', title: 'Dentist', emoji: '🦷', color: '#43A047', category: 'health', reminder: '1hour' },
      { id: 'gym', title: 'Gym / Workout', emoji: '💪', color: '#66BB6A', category: 'health', reminder: '30min' },
      { id: 'medicine', title: 'Medicine Reminder', emoji: '💊', color: '#26A69A', category: 'health', reminder: 'at_time' },
      { id: 'yoga', title: 'Yoga / Meditation', emoji: '🧘', color: '#80CBC4', category: 'health', reminder: '15min' },
    ],
  },
  {
    id: 'travel',
    name: 'Travel',
    emoji: '✈️',
    color: '#00ACC1',
    templates: [
      { id: 'flight', title: 'Flight', emoji: '✈️', color: '#00ACC1', category: 'travel', reminder: '1day' },
      { id: 'hotel', title: 'Hotel Check-in', emoji: '🏨', color: '#0288D1', category: 'travel', reminder: '1hour' },
      { id: 'trip', title: 'Road Trip', emoji: '🚗', color: '#00BCD4', category: 'travel', reminder: '1hour' },
      { id: 'vacation', title: 'Vacation', emoji: '🏖️', color: '#26C6DA', category: 'travel', reminder: '1day' },
    ],
  },
  {
    id: 'education',
    name: 'Education',
    emoji: '🎓',
    color: '#A600FF',
    templates: [
      { id: 'exam', title: 'Exam', emoji: '📝', color: '#A600FF', category: 'education', reminder: '1day' },
      { id: 'class', title: 'Class / Lecture', emoji: '📚', color: '#7B1FA2', category: 'education', reminder: '15min' },
      { id: 'assignment', title: 'Assignment Due', emoji: '📋', color: '#AB47BC', category: 'education', reminder: '1day' },
      { id: 'study', title: 'Study Session', emoji: '🧠', color: '#CE93D8', category: 'education', reminder: '10min' },
    ],
  },
  {
    id: 'personal',
    name: 'Personal',
    emoji: '🛒',
    color: '#FFB300',
    templates: [
      { id: 'shopping', title: 'Shopping', emoji: '🛒', color: '#FFB300', category: 'personal', reminder: '30min' },
      { id: 'bill', title: 'Bill Payment', emoji: '💳', color: '#FF8F00', category: 'personal', reminder: '1day' },
      { id: 'dinner', title: 'Dinner / Restaurant', emoji: '🍽️', color: '#EF6C00', category: 'personal', reminder: '1hour' },
      { id: 'movie', title: 'Movie / Show', emoji: '🎬', color: '#F57C00', category: 'personal', reminder: '30min' },
      { id: 'party', title: 'Party / Event', emoji: '🎉', color: '#FFA726', category: 'personal', reminder: '1hour' },
    ],
  },
];