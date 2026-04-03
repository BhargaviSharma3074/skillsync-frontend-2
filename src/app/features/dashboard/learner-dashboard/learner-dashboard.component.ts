import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';
import { MentorResponse, MentorService } from 'src/app/core/services/mentor.service';
import { SessionResponse, SessionService } from 'src/app/core/services/session.service';
import { MentorApplicationDialogComponent } from '../components/mentor-application-dialog/mentor-application-dialog.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-learner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  templateUrl: './learner-dashboard.component.html',
  styleUrls: ['./learner-dashboard.component.scss'],  // ← fix: styleUrl → styleUrls
})
export class LearnerDashboardComponent implements OnInit {
  private authService    = inject(AuthService);
  private mentorService  = inject(MentorService);
  private sessionService = inject(SessionService);
  private dialog = inject(MatDialog);

  get user() { return this.authService.currentUser!; }

  // ── Reactive state via Signals ──
  sessions       = signal<SessionResponse[]>([]);
  mentors        = signal<MentorResponse[]>([]);
  loadingSessions = signal(true);
  loadingMentors  = signal(true);

  // ── Computed values (auto-update when signals change) ──
  firstName = computed(() => {
    return this.user?.name?.split(' ')[0] ?? this.user?.username ?? 'Learner';
  });

  userInitials = computed(() => {
    const name = this.user?.name || this.user?.username || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  upcomingSessions = computed(() =>
    this.sessions().filter(s => s.status === 'REQUESTED' || s.status === 'ACCEPTED')
  );

  completedSessions = computed(() =>
    this.sessions().filter(s => s.status === 'COMPLETED')
  );

  connectedMentors = computed(() =>
    new Set(
      this.sessions()
        .filter(s => s.status === 'ACCEPTED' || s.status === 'COMPLETED')
        .map(s => s.mentorId)
    ).size
  );

  stats = computed(() => [
    { label: 'Upcoming Sessions',  value: this.upcomingSessions().length,  sub: 'Active',   icon: 'calendar_today', color: '#4285f4', bg: '#e8f0fe' },
    { label: 'Connected Mentors',  value: this.connectedMentors(),         sub: 'Total',    icon: 'people',         color: '#34a853', bg: '#e6f4ea' },
    { label: 'Sessions Completed', value: this.completedSessions().length, sub: 'All time', icon: 'star',           color: '#f9a825', bg: '#fff8e1' },
    { label: 'Total Sessions',     value: this.sessions().length,          sub: 'All time', icon: 'event',          color: '#1e88e5', bg: '#e3f2fd' },
  ]);

  get greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── Data fetching ──
  ngOnInit() {
    this.sessionService.getUserSessions(this.user.id).subscribe({
      next: data => {
        this.sessions.set(data);             // ← signal.set() triggers re-render
        this.loadingSessions.set(false);
      },
      error: () => this.loadingSessions.set(false),
    });

    this.mentorService.getAll({ sortBy: 'rating' }).subscribe({
      next: (data: any) => {
        const list: MentorResponse[] = Array.isArray(data) ? data : (data?.content ?? []);
        this.mentors.set(list.filter(m => m.status === 'ACTIVE').slice(0, 3));
        this.loadingMentors.set(false);
      },
      error: () => this.loadingMentors.set(false),
    });
  }

  // ── Helpers ──
  mentorInitials(mentor: MentorResponse): string {
    return `M${mentor.id}`.slice(0, 2).toUpperCase();
  }

  mentorColor(mentor: MentorResponse): string {
    const colors = ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#f9a825'];
    return colors[mentor.id % colors.length];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  stars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  openMentorApplication() {
    const dialogRef = this.dialog.open(MentorApplicationDialogComponent, {
      width: '500px', // Nice clean width
      disableClose: true, // Forces them to click cancel or submit
      autoFocus: false,
      panelClass: 'custom-modal-panel' // Optional: if you want to style the outer container later
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // The user submitted the form!
        // Here you could trigger a success toast notification like:
        // this.toastService.success('Application submitted successfully! Our admins will review it shortly.');
        console.log('User applied with:', result);
      }
    });
  }
}
