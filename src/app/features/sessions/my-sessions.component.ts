import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  SessionResponse,
  SessionService,
  SessionStatus,
} from 'src/app/core/services/session.service';
import {
  UserLookupService,
  UserBasic,
} from 'src/app/core/services/user-lookup.service';

type FilterTab = 'all' | 'upcoming' | 'pending' | 'completed' | 'cancelled';

@Component({
  selector: 'app-my-sessions',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    SkeletonComponent,
  ],
  templateUrl: './my-sessions.component.html',
  styleUrls: ['./my-sessions.component.scss'],
})
export class MySessionsComponent implements OnInit {
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private userLookupService = inject(UserLookupService);
  private dialog = inject(MatDialog);
  get user() {
    return this.authService.currentUser!;
  }
  get isLearner() {
    return this.user.role?.toUpperCase().includes('LEARNER');
  }
  get isMentor() {
    return this.user.role?.toUpperCase().includes('MENTOR');
  }

  sessions = signal<SessionResponse[]>([]);
  loading = signal(true);
  activeTab = signal<FilterTab>('all');
  userMap = signal<Map<number, UserBasic>>(new Map());

  filtered = computed(() => {
    const tab = this.activeTab();
    const all = this.sessions();
    const base = this.isMentor
      ? all.filter((s) => s.learnerId !== this.user.id)
      : all;
    // PENDING_PAYMENT = awaiting payment confirmation
    // REQUESTED       = payment done, awaiting mentor acceptance
    // ACCEPTED        = mentor confirmed, session is booked
    if (tab === 'pending')
      return base.filter((s) => s.status === 'PENDING_PAYMENT');
    if (tab === 'upcoming')
      return base.filter(
        (s) => s.status === 'REQUESTED' || s.status === 'ACCEPTED',
      );
    if (tab === 'completed')
      return base.filter((s) => s.status === 'COMPLETED');
    if (tab === 'cancelled')
      return base.filter(
        (s) => s.status === 'CANCELLED' || s.status === 'REJECTED',
      );
    return base;
  });

  pendingCount = computed(
    () => this.sessions().filter((s) => s.status === 'PENDING_PAYMENT').length,
  );

  tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'pending', label: 'Pending Payment' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

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
  }

  private fetchUserDetails(sessions: SessionResponse[]) {
    // Collect all unique user IDs (mentors and learners)
    const userIds = new Set<number>();
    sessions.forEach((s) => {
      userIds.add(s.mentorId);
      userIds.add(s.learnerId);
    });

    // Batch fetch user details
    if (userIds.size > 0) {
      this.userLookupService
        .batchFetch(Array.from(userIds))
        .subscribe((map) => this.userMap.set(map));
    }
  }

  getDisplayName(userId: number): string {
    const user = this.userMap().get(userId);
    return this.userLookupService.displayName(user);
  }

  cancel(sessionId: number) {
    this.sessionService.cancel(sessionId).subscribe({
      next: (updated) =>
        this.sessions.update((list) =>
          list.map((s) => (s.id === sessionId ? updated : s)),
        ),
    });
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

  complete(sessionId: number) {
    this.sessionService.complete(sessionId).subscribe({
      next: (updated) =>
        this.sessions.update((list) =>
          list.map((s) => (s.id === sessionId ? updated : s)),
        ),
    });
  }

  canCancel(s: SessionResponse) {
    return (
      this.isLearner &&
      (s.status === 'PENDING_PAYMENT' ||
        s.status === 'REQUESTED' ||
        s.status === 'ACCEPTED')
    );
  }
  canAccept(s: SessionResponse) {
    // Mentor can accept only if status is REQUESTED and session time hasn't passed
    if (!this.isMentor || s.status !== 'REQUESTED') return false;
    const sessionTime = new Date(s.rescheduledSessionDate ?? s.sessionDate);
    return sessionTime > new Date();
  }
  canReject(s: SessionResponse) {
    return this.isMentor && s.status === 'REQUESTED';
  }
  canComplete(s: SessionResponse) {
    return this.isMentor && s.status === 'ACCEPTED';
  }

  shouldShowReschedule(s: SessionResponse): boolean {
    // Show reschedule for mentor if session time has passed but status is still REQUESTED
    if (!this.isMentor || s.status !== 'REQUESTED') return false;
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
      const dialogRef = this.dialog.open(RescheduleSessionDialogComponent, {
        width: '500px',
        data: { session },
      });

      dialogRef.afterClosed().subscribe((result) => {
        try {
          if (result && result.newSessionDate) {
            this.sessionService
              .reschedule(session.id, result.newSessionDate)
              .subscribe({
                next: (updated) =>
                  this.sessions.update((list) =>
                    list.map((s) => (s.id === session.id ? updated : s)),
                  ),
                error: (err) => {
                  console.error('Reschedule error:', err);
                  const errorMsg = err?.error?.message || err?.message || 'Failed to reschedule session. Please try again.';
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

  formatDate(d: string) {
    return new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  statusClass(status: SessionStatus) {
    const map: Record<SessionStatus, string> = {
      PENDING_PAYMENT: 'badge--pending',
      REQUESTED: 'badge--requested',
      ACCEPTED: 'badge--accepted',
      COMPLETED: 'badge--completed',
      REJECTED: 'badge--rejected',
      CANCELLED: 'badge--cancelled',
    };
    return map[status] ?? '';
  }
}

// ─── Reschedule Dialog Component ─────────────────────────────
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-reschedule-session-dialog',
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
export class RescheduleSessionDialogComponent {
  private dialogRef = inject(MatDialogRef<RescheduleSessionDialogComponent>);
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
      alert('An error occurred while processing your reschedule request. Please try again.');
    }
  }
}
