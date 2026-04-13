import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from 'src/app/core/auth/auth.service';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import {
  MentorResponse,
  MentorService,
} from 'src/app/core/services/mentor.service';
import {
  SessionResponse,
  SessionService,
} from 'src/app/core/services/session.service';
import {
  UserBasic,
  UserLookupService,
} from 'src/app/core/services/user-lookup.service';
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
    RouterLink,
    SkeletonComponent,
  ],
  templateUrl: './learner-dashboard.component.html',
  styleUrls: ['./learner-dashboard.component.scss'],
})
export class LearnerDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private mentorService = inject(MentorService);
  private sessionService = inject(SessionService);
  private userLookup = inject(UserLookupService);
  private dialog = inject(MatDialog);

  get user() {
    return this.authService.currentUser!;
  }

  // ── Reactive state via Signals ──
  sessions = signal<SessionResponse[]>([]);
  mentors = signal<MentorResponse[]>([]);
  userMap = signal(new Map<number, UserBasic>());
  // mentorId (mentor-service profile ID) → display name
  sessionMentorNames = signal(new Map<number, string>());
  loadingSessions = signal(true);
  loadingMentors = signal(true);

  firstName = computed(() => {
    return this.user?.name?.split(' ')[0] ?? this.user?.username ?? 'Learner';
  });

  userInitials = computed(() => {
    const name = this.user?.name || this.user?.username || 'U';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  // REQUESTED = payment confirmed, awaiting mentor acceptance. ACCEPTED = mentor confirmed.
  // Both are real upcoming sessions (payment is done for both). PENDING_PAYMENT is not yet confirmed.
  upcomingSessions = computed(() =>
    this.sessions().filter(
      (s) => s.status === 'REQUESTED' || s.status === 'ACCEPTED',
    ),
  );

  completedSessions = computed(() =>
    this.sessions().filter((s) => s.status === 'COMPLETED'),
  );

  connectedMentors = computed(
    () =>
      new Set(
        this.sessions()
          .filter((s) => s.status === 'ACCEPTED' || s.status === 'COMPLETED')
          .map((s) => s.mentorId),
      ).size,
  );

  stats = computed(() => [
    {
      label: 'Upcoming Sessions',
      value: this.upcomingSessions().length,
      sub: 'Active',
      icon: 'calendar_today',
      color: '#4285f4',
      bg: '#e8f0fe',
    },
    {
      label: 'Connected Mentors',
      value: this.connectedMentors(),
      sub: 'Total',
      icon: 'people',
      color: '#34a853',
      bg: '#e6f4ea',
    },
    {
      label: 'Sessions Completed',
      value: this.completedSessions().length,
      sub: 'All time',
      icon: 'star',
      color: '#f9a825',
      bg: '#fff8e1',
    },
    {
      label: 'Total Sessions',
      value: this.sessions().length,
      sub: 'All time',
      icon: 'event',
      color: '#1e88e5',
      bg: '#e3f2fd',
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

  // ── Data fetching ──
  ngOnInit() {
    this.sessionService
      .getUserSessions(this.user.id)
      .pipe(
        switchMap((data) => {
          this.sessions.set(data);
          this.loadingSessions.set(false);
          const uniqueMentorIds = [...new Set(data.map((s) => s.mentorId))];
          if (!uniqueMentorIds.length) return of([]);
          return forkJoin(
            uniqueMentorIds.map((id) => this.mentorService.getById(id)),
          );
        }),
        switchMap((mentorProfiles: MentorResponse[]) => {
          if (!mentorProfiles.length) return of(new Map<number, UserBasic>());
          const userIds = mentorProfiles.map((m) => m.userId);
          return this.userLookup.batchFetch(userIds).pipe(
            switchMap((userMapResult) => {
              const nameMap = new Map<number, string>();
              mentorProfiles.forEach((m) => {
                nameMap.set(
                  m.id,
                  this.userLookup.displayName(userMapResult.get(m.userId)),
                );
              });
              this.sessionMentorNames.set(nameMap);
              return of(userMapResult);
            }),
          );
        }),
      )
      .subscribe({
        error: () => this.loadingSessions.set(false),
      });

    this.mentorService.getAll({ sortBy: 'rating' }).subscribe({
      next: (data: any) => {
        const list: MentorResponse[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        const top = list.filter((m) => m.status === 'ACTIVE').slice(0, 3);
        this.mentors.set(top);
        this.loadingMentors.set(false);
        const ids = top.map((m) => m.userId);
        if (ids.length) {
          this.userLookup
            .batchFetch(ids)
            .subscribe((map) => this.userMap.set(map));
        }
      },
      error: () => this.loadingMentors.set(false),
    });
  }

  // ── Helpers ──
  mentorName(mentor: MentorResponse): string {
    return this.userLookup.displayName(this.userMap().get(mentor.userId));
  }

  sessionMentorName(mentorId: number): string {
    return this.sessionMentorNames().get(mentorId) ?? `Mentor #${mentorId}`;
  }

  mentorInitials(mentor: MentorResponse): string {
    const name = this.mentorName(mentor);
    return name === 'Unknown'
      ? `M${mentor.userId}`.slice(0, 2).toUpperCase()
      : name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
  }

  mentorColor(mentor: MentorResponse): string {
    const colors = ['#7c3aed', '#ec4899', '#06b6d4', '#3b82f6', '#22c55e'];
    return colors[mentor.id % colors.length];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
      panelClass: 'custom-modal-panel', // Optional: if you want to style the outer container later
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // The user submitted the form!
        // Here you could trigger a success toast notification like:
        // this.toastService.success('Application submitted successfully! Our admins will review it shortly.');
        console.log('User applied with:', result);
      }
    });
  }
}
