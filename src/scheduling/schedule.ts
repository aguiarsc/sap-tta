import { TimeSlot, DayType, IScheduleManager, Schedules } from '../core/types';

export class ScheduleManager implements IScheduleManager {
  private fridaySchedule: TimeSlot[];
  private regularSchedule: TimeSlot[];

  constructor(schedules: Schedules) {
    this.fridaySchedule = schedules.friday;
    this.regularSchedule = schedules.regular;
  }

  private isFriday(): boolean {
    const today = new Date();
    return today.getDay() === 5;
  }

  private filterPastEvents(slots: TimeSlot[]): TimeSlot[] {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    return slots.filter(slot => {
      const [hour, minute] = slot.time.split(':').map(Number);
      const slotTimeInMinutes = hour * 60 + minute;
      
      return slotTimeInMinutes <= currentTimeInMinutes;
    });
  }

  getCurrentSchedule(): {
    dayType: DayType;
    slots: TimeSlot[];
    availableSlots: TimeSlot[];
  } {
    const isFriday = this.isFriday();
    const allSlots = isFriday ? this.fridaySchedule : this.regularSchedule;
    const availableSlots = this.filterPastEvents(allSlots);
    
    return {
      dayType: isFriday ? 'friday' : 'regular',
      slots: allSlots,
      availableSlots: availableSlots
    };
  }
}
