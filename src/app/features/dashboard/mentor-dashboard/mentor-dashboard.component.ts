import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/core/auth/auth.service';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import {
  MentorResponse,
  MentorService,
} from 'src/app/core/services/mentor.service';
import {
  ReviewResponseDTO,
  ReviewService,
} from 'src/app/core/services/review.service';
import {
  SessionResponse,
  SessionService,
} from 'src/app/core/services/session.service';
import {
  UserLookupService,
  UserBasic,
} from 'src/app/core/services/user-lookup.service';

@Component({
  selector: 'app-mentor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    SkeletonComponent,
  ],
  templateUrl: './mentor-dashboard.component.html',
  styleUrls: ['./mentor-dashboard.component.scss'],
})
export class MentorDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private mentorService = inject(MentorService);
  private reviewService = inject(ReviewService);
  private userLookupService = inject(UserLookupService);
  private dialog = inject(MatDialog);

  get user() {
    return this.authService.currentUser!;
  }

  sessions = signal<SessionResponse[]>([]);
  mentorProfile = signal<MentorResponse | null>(null);
  reviews = signal<ReviewResponseDTO[]>([]);
  loading = signal(true);
  userMap = signal<Map<number, UserBasic>>(new Map());

  firstName = computed(
    () => this.user?.name?.split(' ')[0] ?? this.user?.username ?? 'Mentor',
  );

  userInitials = computed(() => {
    const name = this.user?.name || this.user?.username || 'U';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  pendingRequests = computed(() =>
    this.sessions().filter((s) => s.status === 'REQUESTED'),
  );
  activeLearners = computed(
    () =>
      new Set(
        this.sessions()
          .filter((s) => s.status === 'ACCEPTED')
          .map((s) => s.learnerId),
      ).size,
  );

  stats = computed(() => [
    {
      label: 'Pending Requests',
      value: this.pendingRequests().length,
      sub: 'Awaiting response',
      icon: 'pending_actions',
      color: '#f9a825',
      bg: '#fff8e1',
    },
    {
      label: 'Active Learners',
      value: this.activeLearners(),
      sub: 'Currently active',
      icon: 'school',
      color: '#4285f4',
      bg: '#e8f0fe',
    },
    {
      label: 'Average Rating',
      value: this.mentorProfile()?.rating ?? '—',
      sub: `${this.mentorProfile()?.reviewCount ?? 0} reviews`,
      icon: 'star',
      color: '#f59e0b',
      bg: '#fff8e1',
    },
    {
      label: 'Total Sessions',
      value: this.sessions().length,
      sub: 'All time',
      icon: 'event_available',
      color: '#34a853',
      bg: '#e6f4ea',
    },
  ]);

  get greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  ngOnInit() {
    this.sessionService.getUserSessions(this.user.id).subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.fetchUserDetails(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });

    this.mentorService.getAll().subscribe({
      next: (data: any) => {
        const list: MentorResponse[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        const profile = list.find((m) => m.userId === this.user.id) ?? null;
        this.mentorProfile.set(profile);
        if (profile) {
          this.reviewService.getForMentor(profile.id).subscribe({
            next: (r) => {
              const reviews = r.slice(0, 3);
              this.reviews.set(reviews);
              this.fetchReviewerDetails(reviews);
            },
            error: () => {},
          });
        }
      },
      error: () => {},
    });
  }

  private fetchUserDetails(sessions: SessionResponse[]) {
    const userIds = new Set<number>();
    sessions.forEach((s) => {
      userIds.add(s.learnerId);
    });
    if (userIds.size > 0) {
      this.userLookupService
        .batchFetch(Array.from(userIds))
        .subscribe((map) => this.userMap.set(map));
    }
  }

  private fetchReviewerDetails(reviews: ReviewResponseDTO[]) {
    const userIds = new Set<number>();
    reviews.forEach((r) => {
      userIds.add(r.userId);
    });
    if (userIds.size > 0) {
      this.userLookupService
        .batchFetch(Array.from(userIds))
        .subscribe((map) => {
          this.userMap.update((existing) => {
            const merged = new Map(existing);
            map.forEach((value, key) => merged.set(key, value));
            return merged;
          });
        });
    }
  }

  getLearnerName(userId: number): string {
    const user = this.userMap().get(userId);
    return this.userLookupService.displayName(user);
  }

  accept(sessionId: number) {
    this.sessionService.accept(sessionId).subscribe({
      next: (updated) =>
        this.sessions.update((list) =>
          list.map((s) => (s.id === sessionId ? updated : s)),
        ),
    });
  }

  reject(sessionId: number) {
    this.sessionService.reject(sessionId).subscribe({
      next: (updated) =>
        this.sessions.update((list) =>
          list.map((s) => (s.id === sessionId ? updated : s)),
        ),
    });
  }

  formatDate(d: string) {
    return new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  stars(r: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(r));
  }
  learnerInitials(id: number) {
    return `L${id}`.slice(0, 2).toUpperCase();
  }
  learnerColor(id: number) {
    return ['#7c3aed', '#ec4899', '#06b6d4', '#3b82f6', '#22c55e'][id % 5];
  }

  canAccept(s: SessionResponse): boolean {
    // Only show accept button if status is REQUESTED and session time hasn't passed
    if (s.status !== 'REQUESTED') return false;
    const sessionTime = new Date(s.rescheduledSessionDate ?? s.sessionDate);
    return sessionTime > new Date();
  }

  shouldShowReschedule(s: SessionResponse): boolean {
    if (s.status !== 'REQUESTED') return false;
    const sessionTime = new Date(s.rescheduledSessionDate ?? s.sessionDate);
    return sessionTime <= new Date();
  }

  isSessionRescheduled(s: SessionResponse): boolean {
    return (
      !!s.rescheduledSessionDate && s.rescheduledSessionDate !== s.sessionDate
    );
  }

  openRescheduleDialog(session: SessionResponse): void {
    try {
      const dialogRef = this.dialog.open(RescheduleSessionDialogComponent2, {
        width: '500px',
        data: { session },
      });

      dialogRef.afterClosed().subscribe((result) => {
        try {
          if (result && result.newSessionDate) {
            this.sessionService
              .reschedule(session.id, result.newSessionDate)
              .subscribe({
                next: (updated) => {
                  this.sessions.update((list) =>
                    list.map((s) => (s.id === session.id ? updated : s)),
                  );
                },
                error: (err) => {
                  console.error('Reschedule error:', err);
                  console.error('Error details:', {
                    status: err?.status,
                    message: err?.error?.message,
                    error: err?.error,
                    fullResponse: err,
                  });
                  const errorMsg =
                    err?.error?.message ||
                    err?.message ||
                    `Failed to reschedule session (Error: ${err?.status || 'Unknown'}). Please try again.`;
                  alert(errorMsg);
                },
              });
          }
        } catch (error) {
          console.error('Error processing reschedule result:', error);
          alert('An unexpected error occurred. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error opening reschedule dialog:', error);
      alert('Failed to open reschedule dialog. Please try again.');
    }
  }
}

// ─── Reschedule Dialog Component ─────────────────────────────
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-reschedule-session-dialog-2',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    FormsModule,
  ],
  template: `
    <div style="padding: 24px">
      <h2 mat-dialog-title>Reschedule Session</h2>

      <mat-dialog-content style="margin-top: 20px">
        <p style="margin-bottom: 16px; color: #666">
          <strong>Original Time:</strong>
          {{ formatDate(data.session.sessionDate) }}
        </p>

        <div style="display: flex; flex-direction: column; gap: 16px">
          <mat-form-field appearance="outline" style="width: 100%">
            <mat-label>New Date</mat-label>
            <input
              matInput
              [matDatepicker]="picker"
              [(ngModel)]="selectedDate"
            />
            <mat-datepicker-toggle
              matSuffix
              [for]="picker"
            ></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 100%">
            <mat-label>New Time</mat-label>
            <mat-select [(ngModel)]="selectedTime">
              @for (time of availableTimeSlots(); track time) {
                <mat-option [value]="time">{{ time }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        @if (selectedDate && selectedTime) {
          <p
            style="margin-top: 16px; padding: 12px; background-color: #f0f7ff; border-radius: 4px; color: #1976d2"
          >
            <strong>New Time:</strong> {{ formatNewDateTime() }}
          </p>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end" style="margin-top: 20px">
        <button mat-stroked-button (click)="onCancel()">Cancel</button>
        <button
          mat-flat-button
          color="primary"
          (click)="onConfirm()"
          [disabled]="!selectedDate || !selectedTime"
        >
          Reschedule
        </button>
      </mat-dialog-actions>
    </div>
  `,
})
export class RescheduleSessionDialogComponent2 {
  private dialogRef = inject(MatDialogRef<RescheduleSessionDialogComponent2>);
  data = inject(MAT_DIALOG_DATA);

  selectedDate: Date | null = null;
  selectedTime = '';
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

  availableTimeSlots() {
    return this.allTimeSlots;
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatNewDateTime(): string {
    if (!this.selectedDate || !this.selectedTime) return '';
    const [time, modifier] = this.selectedTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const newDateTime = new Date(this.selectedDate);
    newDateTime.setHours(hours, minutes, 0, 0);
    return newDateTime.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    try {
      if (!this.selectedDate || !this.selectedTime) {
        alert('Please select both date and time.');
        return;
      }

      const [time, modifier] = this.selectedTime.split(' ');
      const timeParts = time.split(':');

      if (timeParts.length !== 2) {
        alert('Invalid time format. Please select a valid time.');
        return;
      }

      let [hours, minutes] = timeParts.map(Number);

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const year = this.selectedDate.getFullYear();
      const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(this.selectedDate.getDate()).padStart(2, '0');
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

      const newSessionDate = `${year}-${month}-${day}T${formattedTime}`;
      const newDateTime = new Date(newSessionDate);

      // Validate that the new date/time is in the future
      if (newDateTime <= new Date()) {
        alert('Please select a future date and time.');
        return;
      }

      this.dialogRef.close({ newSessionDate });
    } catch (error) {
      console.error('Error in onConfirm:', error);
      alert(
        'An error occurred while processing your reschedule request. Please try again.',
      );
    }
  }
}
