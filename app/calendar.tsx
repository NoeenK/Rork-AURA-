import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries, calendarEvents } = useJournal();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const styles = createStyles(colors);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysCount, startingDayOfWeek, year, month };
  }, [currentDate]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    });
    
    calendarEvents.forEach(event => {
      try {
        const date = new Date(event.date);
        if (!isNaN(date.getTime())) {
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          map.set(dateKey, (map.get(dateKey) || 0) + 1);
        }
      } catch (error) {
        console.error('Error parsing event date:', error);
      }
    });
    
    return map;
  }, [entries, calendarEvents]);

  const getEventsForDate = (day: number) => {
    const dateKey = `${daysInMonth.year}-${daysInMonth.month}-${day}`;
    return eventsMap.get(dateKey) || 0;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderCalendarDays = () => {
    const days = [];
    const { daysCount, startingDayOfWeek } = daysInMonth;

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.dayCell}>
          <View style={styles.dayContent} />
        </View>
      );
    }

    for (let day = 1; day <= daysCount; day++) {
      const eventsCount = getEventsForDate(day);
      const isToday = 
        day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();
      const isSelected = selectedDate &&
        day === selectedDate.getDate() &&
        currentDate.getMonth() === selectedDate.getMonth() &&
        currentDate.getFullYear() === selectedDate.getFullYear();

      days.push(
        <TouchableOpacity 
          key={`day-${day}`} 
          style={styles.dayCell}
          onPress={() => setSelectedDate(new Date(daysInMonth.year, daysInMonth.month, day))}
          activeOpacity={0.7}
        >
          <View style={[styles.dayContent, isToday && styles.today, isSelected && styles.selected]}>
            <Text style={[styles.dayText, (isToday || isSelected) && styles.todayText]}>{day}</Text>
            {eventsCount > 0 && (
              <View style={styles.eventDot}>
                <Text style={styles.eventCount}>{eventsCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const selectedDateEvents = useMemo(() => {
    const targetDate = selectedDate || new Date();
    const journalEvents = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate.getDate() === targetDate.getDate() &&
        entryDate.getMonth() === targetDate.getMonth() &&
        entryDate.getFullYear() === targetDate.getFullYear();
    });
    
    const extractedEvents = calendarEvents.filter(event => {
      try {
        const eventDate = new Date(event.date);
        return eventDate.getDate() === targetDate.getDate() &&
          eventDate.getMonth() === targetDate.getMonth() &&
          eventDate.getFullYear() === targetDate.getFullYear();
      } catch (error) {
        return false;
      }
    });
    
    return { journalEvents, extractedEvents };
  }, [entries, calendarEvents, selectedDate]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView style={[styles.content, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Calendar</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.text} size={28} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarContainer}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <ChevronLeft color={colors.text} size={28} />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <ChevronRight color={colors.text} size={28} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDaysContainer}>
            {dayNames.map(day => (
              <View key={day} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysContainer}>
            {renderCalendarDays()}
          </View>
        </View>

        <View style={styles.todaySection}>
          <Text style={styles.todaySectionTitle}>
            {selectedDate ? `Events on ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : "Today's Events"}
          </Text>
          
          {selectedDateEvents.extractedEvents.length > 0 && (
            <View style={styles.eventSection}>
              <Text style={styles.eventSectionTitle}>Calendar Events</Text>
              {selectedDateEvents.extractedEvents.map((event, idx) => (
                <View key={`extracted-${idx}`} style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    {event.time && (
                      <Text style={styles.eventTime}>{event.time}</Text>
                    )}
                  </View>
                  <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
                  {event.participants && event.participants.length > 0 && (
                    <Text style={styles.eventParticipants}>With: {event.participants.join(', ')}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
          
          {selectedDateEvents.journalEvents.length > 0 && (
            <View style={styles.eventSection}>
              <Text style={styles.eventSectionTitle}>Journal Entries</Text>
              {selectedDateEvents.journalEvents.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => router.push('/journal')}
                >
                  <View style={styles.eventCardHeader}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(event.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {selectedDateEvents.extractedEvents.length === 0 && selectedDateEvents.journalEvents.length === 0 && (
            <Text style={styles.noEventsText}>No events for this date</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  calendarContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 16,
    backdropFilter: 'blur(10px)',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
  },
  dayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  today: {
    backgroundColor: colors.accent,
  },
  selected: {
    backgroundColor: AuraColors.accentOrange,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.text,
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  eventDot: {
    position: 'absolute',
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCount: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  todaySection: {
    margin: 16,
    marginTop: 24,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
  todaySectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
  },
  eventCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  noEventsText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  eventSection: {
    marginBottom: 20,
  },
  eventSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
    opacity: 0.7,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  eventParticipants: {
    fontSize: 13,
    color: AuraColors.accentOrange,
    marginTop: 8,
    fontWeight: '600' as const,
  },
});
