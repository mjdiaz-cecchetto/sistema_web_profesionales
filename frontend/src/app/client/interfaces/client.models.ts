export interface Professional {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl: string;
  specialties: string[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price?: number;
}

export interface TimeSlot {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
}

export interface Appointment {
  id?: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  patientData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    healthInsurance: string;
    isFirstVisit: boolean;
    age: number;
    sex: string;
    notes?: string;
  };
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}
