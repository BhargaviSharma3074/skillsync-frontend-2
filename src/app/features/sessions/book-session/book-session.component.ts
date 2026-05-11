import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import {
  MentorResponse,
  MentorService,
} from 'src/app/core/services/mentor.service';
import {
  SessionService,
  BookSessionPayload,
} from 'src/app/core/services/session.service';
import { PaymentService } from 'src/app/core/services/payment.service';

declare var Razorpay: any;

export type BookingStep =
  | 'select'
  | 'confirm'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled';

@Component({
  selector: 'app-book-session',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    SkeletonComponent,
  ],
  templateUrl: './book-session.component.html',
  styleUrls: ['./book-session.component.scss'],
})
export class BookSessionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mentorService = inject(MentorService);
  private sessionService = inject(SessionService);
  private paymentService = inject(PaymentService);

  // --- State Signals ---
  mentor = signal<MentorResponse | null>(null);
  currentStep = signal<BookingStep>('select');
  selectedDate = signal<Date | null>(new Date());
  selectedTime = signal<string>('');
  selectedDuration = signal<number>(60);
  sessionTopic = signal<string>('');

  // --- Post-booking/payment state ---
  bookedSessionId = signal<number | null>(null);
  paymentId = signal<string>('');
  paymentError = signal<string>('');
  isProcessing = signal(false);

  // --- Date constraints ---
  minDate = new Date();
  maxDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
  allTimeSlots = [
    '09:00 AM',
    '10:30 AM',
    '11:00 AM',
    '02:00 PM',
    '04:30 PM',
    '06:00 PM',
    '08:00 PM',
  ];
  durations = [30, 60, 90];

  // --- Computed ---
  availableTimeSlots = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    const isToday = date.toDateString() === new Date().toDateString();
    if (!isToday) return this.allTimeSlots;
    const now = new Date();
    return this.allTimeSlots.filter((slot) => {
      let [time, modifier] = slot.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      const slotDate = new Date();
      slotDate.setHours(hours, minutes, 0, 0);
      return slotDate > now;
    });
  });

  totalPrice = computed(() => {
    const m = this.mentor();
    return m ? (m.hourlyRate * this.selectedDuration()) / 60 : 0;
  });

  stepNum = computed(() => {
    const s = this.currentStep();
    if (s === 'select') return 1;
    if (s === 'confirm') return 2;
    return 3;
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('mentorId');
    if (id) {
      this.mentorService
        .getById(+id)
        .subscribe((data) => this.mentor.set(data));
    }
    const slots = this.availableTimeSlots();
    if (slots.length > 0) this.selectedTime.set(slots[0]);
  }

  // --- Step navigation ---
  goToConfirm() {
    if (!this.selectedTime()) return;
    this.currentStep.set('confirm');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBackToSelect() {
    this.currentStep.set('select');
  }

  // --- Payment flow ---
  onConfirmAndPay() {
    if (this.isProcessing()) return;
    this.isProcessing.set(true);
    this.currentStep.set('processing');

    const date = this.selectedDate();
    const year = date?.getFullYear();
    const month = String(date!.getMonth() + 1).padStart(2, '0');
    const day = String(date!.getDate()).padStart(2, '0');

    const [time, modifier] = this.selectedTime().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    const payload: BookSessionPayload = {
      mentorId: this.mentor()?.id,
      sessionDate: `${year}-${month}-${day}T${formattedTime}`,
      topic: this.sessionTopic() || 'General Mentorship Session',
    };

    this.sessionService.book(payload).subscribe({
      next: (session: any) => {
        this.bookedSessionId.set(session.id);
        this.initiateRazorpay(session.id);
      },
      error: () => {
        this.paymentError.set(
          'Failed to create the session. Please try again.',
        );
        this.currentStep.set('failed');
        this.isProcessing.set(false);
      },
    });
  }

  private initiateRazorpay(sessionId: number) {
    this.paymentService.initiatePayment(sessionId).subscribe({
      next: (order) => {
        this.isProcessing.set(false);
        const options = {
          key: order.razorpayKeyId,
          amount: order.amount * 100,
          currency: order.currency,
          name: 'SkillSync',
          description: `Session Booking #${sessionId}`,
          order_id: order.gatewayOrderId,
          handler: (res: any) => this.verifyPayment(sessionId, res),
          modal: {
            ondismiss: () => {
              // User closed modal without paying — cancel the REQUESTED session so it
              // doesn't linger on the dashboard. A fresh booking is needed to retry.
              const sid = this.bookedSessionId();
              if (sid) {
                this.sessionService.cancel(sid).subscribe();
              }
              this.currentStep.set('cancelled');
            },
          },
          theme: { color: '#7c3aed' },
        };
        const rzp = new Razorpay(options);
        rzp.open();
      },
      error: () => {
        this.paymentError.set('Could not initiate payment. Please try again.');
        this.currentStep.set('failed');
        this.isProcessing.set(false);
      },
    });
  }

  private verifyPayment(sessionId: number, response: any) {
    const verifyData = {
      sessionId,
      gatewayOrderId: response.razorpay_order_id,
      gatewayPaymentId: response.razorpay_payment_id,
      gatewaySignature: response.razorpay_signature,
    };
    this.paymentService.verifyPayment(verifyData).subscribe({
      next: () => {
        this.paymentId.set(response.razorpay_payment_id);
        this.currentStep.set('success');
      },
      error: () => {
        // Backend publishes payment.failed event → session will be auto-cancelled via RabbitMQ.
        // No retry possible; a new booking is needed.
        this.paymentError.set(
          `Payment verification failed. Session #${this.bookedSessionId()} has been cancelled. Contact support if amount was deducted (Ref: ${response.razorpay_payment_id}).`,
        );
        this.currentStep.set('failed');
      },
    });
  }

  // --- Helpers ---
  mentorName(m: MentorResponse): string {
    return m.name || m.username || `Mentor #${m.id}`;
  }
  mentorInitials(m: MentorResponse) {
    return `M${m.id}`.slice(0, 2).toUpperCase();
  }
  mentorColor(m: MentorResponse) {
    const colors = [
      '#7c3aed',
      '#ec4899',
      '#06b6d4',
      '#3b82f6',
      '#22c55e',
      '#f59e0b',
      '#f43f5e',
    ];
    return colors[m.id % colors.length];
  }
  stars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
  formatDate(date: Date | null) {
    return date
      ? date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Select Date';
  }
  shortDate(date: Date | null) {
    return date
      ? date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '';
  }
}
