import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';
import { MentorResponse, MentorService } from 'src/app/core/services/mentor.service';
import { ReviewResponseDTO, ReviewService } from 'src/app/core/services/review.service';
import { SessionResponse, SessionService } from 'src/app/core/services/session.service';

@Component({
  selector: 'app-mentor-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './mentor-dashboard.component.html',
  styleUrls: ['./mentor-dashboard.component.scss'],
})
export class MentorDashboardComponent implements OnInit {
  private authService    = inject(AuthService);
  private sessionService = inject(SessionService);
  private mentorService  = inject(MentorService);
  private reviewService  = inject(ReviewService);

  get user() { return this.authService.currentUser!; }

  sessions      = signal<SessionResponse[]>([]);
  mentorProfile = signal<MentorResponse | null>(null);
  reviews       = signal<ReviewResponseDTO[]>([]);
  loading       = signal(true);

  firstName = computed(() => this.user?.name?.split(' ')[0] ?? this.user?.username ?? 'Mentor');

  userInitials = computed(() => {
    const name = this.user?.name || this.user?.username || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  pendingRequests = computed(() => this.sessions().filter(s => s.status === 'REQUESTED'));
  activeLearners  = computed(() =>
    new Set(this.sessions().filter(s => s.status === 'ACCEPTED').map(s => s.learnerId)).size
  );

  stats = computed(() => [
    { label: 'Pending Requests', value: this.pendingRequests().length,          sub: 'Awaiting response', icon: 'pending_actions', color: '#f9a825', bg: '#fff8e1' },
    { label: 'Active Learners',  value: this.activeLearners(),                  sub: 'Currently active',  icon: 'school',          color: '#4285f4', bg: '#e8f0fe' },
    { label: 'Average Rating',   value: this.mentorProfile()?.rating ?? '—',   sub: `${this.mentorProfile()?.reviewCount ?? 0} reviews`, icon: 'star', color: '#f59e0b', bg: '#fff8e1' },
    { label: 'Total Sessions',   value: this.sessions().length,                 sub: 'All time',          icon: 'event_available', color: '#34a853', bg: '#e6f4ea' },
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

  ngOnInit() {
    this.sessionService.getUserSessions(this.user.id).subscribe({
      next: data => { this.sessions.set(data); this.loading.set(false); },
      error: ()   => { this.loading.set(false); },
    });

    this.mentorService.getAll().subscribe({
      next: (data: any) => {
        const list: MentorResponse[] = Array.isArray(data) ? data : (data?.content ?? []);
        const profile = list.find(m => m.userId === this.user.id) ?? null;
        this.mentorProfile.set(profile);
        if (profile) {
          this.reviewService.getForMentor(profile.id).subscribe({
            next: r => this.reviews.set(r.slice(0, 3)),
            error: () => {},
          });
        }
      },
      error: () => {},
    });
  }

  accept(sessionId: number) {
    this.sessionService.accept(sessionId).subscribe({
      next: updated => this.sessions.update(list =>
        list.map(s => s.id === sessionId ? updated : s)
      ),
    });
  }

  reject(sessionId: number) {
    this.sessionService.reject(sessionId).subscribe({
      next: updated => this.sessions.update(list =>
        list.map(s => s.id === sessionId ? updated : s)
      ),
    });
  }

  formatDate(d: string) {
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  stars(r: number) { return Array.from({ length: 5 }, (_, i) => i < Math.round(r)); }
  learnerInitials(id: number) { return `L${id}`.slice(0, 2).toUpperCase(); }
  learnerColor(id: number) {
    return ['#e53935','#1e88e5','#43a047','#8e24aa','#f9a825'][id % 5];
  }
}
