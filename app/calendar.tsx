import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useJournal } from '@/contexts/JournalContext';
import { AuraColors } from '@/constants/colors';
import * as Calendar from 'expo-calendar';
import * as Haptics from 'expo-haptics';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { entries, calendarEvents } = useJournal();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarPermission, setCalendarPermission] = useState(false);

  const requestCalendarPermissions = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      setCalendarPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  };

  const convertTo12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const exportToNativeCalendar = async (event: any) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const hasPermission = calendarPermission || await requestCalendarPermissions();
      
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Calendar access is required to export events. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert('Error', 'No calendar found on your device');
        return;
      }

      const eventDate = new Date(event.date);
      let startDate = eventDate;
      let endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);

      if (event.time) {
        const [hours, minutes] = event.time.split(':').map(Number);
        startDate.setHours(hours, minutes, 0, 0);
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      }

      const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
        title: event.title,
        startDate,
        endDate,
        notes: event.description || '',
        timeZone: 'UTC',
      });

      console.log('Event created in native calendar:', eventId);

      Alert.alert(
        'Success',
        'Event added to your calendar!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error exporting to native calendar:', error);
      Alert.alert(
        'Error',
        'Failed to add event to calendar. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

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
    const map = new Map<string, boolean>();
    
    calendarEvents.forEach(event => {
      try {
        const date = new Date(event.date);
        if (!isNaN(date.getTime())) {
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          map.set(dateKey, true);
        }
      } catch (error) {
        console.error('Error parsing event date:', error);
      }
    });
    
    return map;
  }, [calendarEvents]);

  const hasEventsForDate = (day: number) => {
    const dateKey = `${daysInMonth.year}-${daysInMonth.month}-${day}`;
    return eventsMap.get(dateKey) || false;
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
      const hasEvents = hasEventsForDate(day);
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
            {hasEvents && !isToday && !isSelected && (
              <View style={styles.eventDotIndicator} />
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const selectedDateEvents = useMemo(() => {
    const targetDate = selectedDate || new Date();
    
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
    
    return { extractedEvents };
  }, [calendarEvents, selectedDate]);

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
          
          {selectedDateEvents.extractedEvents.length > 0 ? (
            <View style={styles.eventSection}>
              {selectedDateEvents.extractedEvents.map((event, idx) => {
                const eventDate = new Date(event.date);
                const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const time12 = event.time ? convertTo12Hour(event.time) : null;

                return (
                  <View key={`extracted-${idx}`} style={styles.eventCardWrapper}>
                    <LinearGradient
                      colors={['#FF8C42', '#FFA500']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.eventCard}
                    >
                      <View style={styles.eventCardContent}>
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                          <Text style={styles.eventDateText}>{dayName}, {dateStr}</Text>
                          {time12 && (
                            <Text style={styles.eventTime}>{time12}</Text>
                          )}
                        </View>
                      </View>
                    </LinearGradient>
                    <TouchableOpacity
                      style={styles.exportButton}
                      onPress={() => exportToNativeCalendar(event)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.exportButtonText}>Add to Apple Calendar</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : (
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
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 66, 0.3)',
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    backgroundColor: AuraColors.accentOrange,
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
  eventDotIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AuraColors.accentOrange,
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
  eventCardWrapper: {
    marginBottom: 16,
  },
  eventCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: AuraColors.accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  eventCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: AuraColors.white,
    marginBottom: 6,
  },
  eventDateText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: AuraColors.white,
  },
  exportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 66, 0.5)',
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center',
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

});
