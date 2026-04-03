import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MentorResponse, MentorService } from 'src/app/core/services/mentor.service';
import { SessionService, BookSessionPayload } from 'src/app/core/services/session.service';
import { PaymentService } from 'src/app/core/services/payment.service';

// Declare Razorpay for the global window object
declare var Razorpay: any;

@Component({
  selector: 'app-book-session',
  standalone: true,
  imports: [
    CommonModule, MatStepperModule, MatDatepickerModule, MatNativeDateModule,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, FormsModule, RouterLink
  ],
  templateUrl: './book-session.component.html',
  styleUrls: ['./book-session.component.scss']
})
export class BookSessionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mentorService = inject(MentorService);
  private sessionService = inject(SessionService);
  private paymentService = inject(PaymentService);

  // --- Data Signals ---
  mentor = signal<MentorResponse | null>(null);
  selectedDate = signal<Date | null>(new Date());
  selectedTime = signal<string>('');
  selectedDuration = signal<number>(60);
  sessionTopic = signal<string>('');
  isProcessing = signal(false);

  // --- Date Constraints ---
  minDate = new Date();
  maxDate = new Date(new Date().setMonth(new Date().getMonth() + 1));

  allTimeSlots = ['09:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '04:30 PM', '06:00 PM', '08:00 PM'];
  durations = [30, 60, 90];

  // --- Computed Logic ---
  availableTimeSlots = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    const isToday = date.toDateString() === new Date().toDateString();
    if (!isToday) return this.allTimeSlots;

    const now = new Date();
    return this.allTimeSlots.filter(slot => {
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

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('mentorId');
    if (id) {
      this.mentorService.getById(+id).subscribe(data => this.mentor.set(data));
    }
    const slots = this.availableTimeSlots();
    if (slots.length > 0) this.selectedTime.set(slots[0]);
  }

  /**
   * Main Payment Flow
   */
async onProceedToPay() {
    if (!this.selectedTime() || this.isProcessing()) return;
    this.isProcessing.set(true);

    const date = this.selectedDate();
    const year = date?.getFullYear();
    const month = String(date!.getMonth() + 1).padStart(2, '0');
    const day = String(date!.getDate()).padStart(2, '0');

    const [time, modifier] = this.selectedTime().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    // Use the Interface here to satisfy the compiler
    const payload: BookSessionPayload = {
      mentorId: this.mentor()?.id,
      sessionDate: `${year}-${month}-${day}T${formattedTime}`,
      topic: this.sessionTopic() || 'General Mentorship Session'
      // No duration needed here since we made it optional in the service
    };

    this.sessionService.book(payload).subscribe({
      next: (session: any) => this.initiateRazorpay(session.id),
      error: (err) => {
        console.error("Booking Error:", err);
        this.isProcessing.set(false);
      }
    });
  }

  private initiateRazorpay(sessionId: number) {
    this.paymentService.initiatePayment(sessionId).subscribe({
      next: (order) => {
        const options = {
          key: order.razorpayKeyId,
          amount: order.amount * 100,
          currency: order.currency,
          name: "SkillSync",
          description: `Booking Session #${sessionId}`,
          order_id: order.gatewayOrderId,
          handler: (res: any) => this.verifyPayment(sessionId, res),
          modal: { ondismiss: () => this.isProcessing.set(false) },
          theme: { color: "#dd0031" }
        };
        const rzp = new Razorpay(options);
        rzp.open();
      },
      error: () => this.isProcessing.set(false)
    });
  }

  private verifyPayment(sessionId: number, response: any) {
    const verifyData = {
      sessionId,
      gatewayOrderId: response.razorpay_order_id,
      gatewayPaymentId: response.razorpay_payment_id,
      gatewaySignature: response.razorpay_signature
    };

    this.paymentService.verifyPayment(verifyData).subscribe({
      next: (result) => {
        alert("Payment Successful! Redirecting to dashboard...");
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        alert("Verification failed. Please contact support.");
        this.isProcessing.set(false);
      }
    });
  }

  // --- Helpers ---
  mentorInitials(m: MentorResponse) { return `M${m.id}`.slice(0, 2).toUpperCase(); }
  mentorColor(m: MentorResponse) {
    const colors = ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#f9a825'];
    return colors[m.id % colors.length];
  }
  stars(rating: number) { return Array.from({ length: 5 }, (_, i) => i < Math.round(rating)); }
  formatDate(date: Date | null) {
    return date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select Date';
  }
}
