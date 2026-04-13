import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { AuthService } from 'src/app/core/auth/auth.service';
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
  selector: 'app-reviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCard,
    SkeletonComponent,
  ],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
})
export class ReviewsComponent implements OnInit {
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private mentorService = inject(MentorService);
  private reviewService = inject(ReviewService);
  private userLookupService = inject(UserLookupService);

  get user() {
    return this.authService.currentUser!;
  }
  get isLearner() {
    return this.user.role?.toUpperCase().includes('LEARNER');
  }

  // Shared
  loading = signal(true);
  userMap = signal<Map<number, UserBasic>>(new Map());

  // Learner: completed sessions + review form
  completedSessions = signal<SessionResponse[]>([]);
  myReviews = signal<ReviewResponseDTO[]>([]);

  reviewingSession = signal<SessionResponse | null>(null);
  reviewRating = signal(5);
  reviewComment = '';
  submitting = signal(false);

  // Mentor: reviews received
  mentorProfile = signal<MentorResponse | null>(null);
  reviews = signal<ReviewResponseDTO[]>([]);

  ngOnInit() {
    if (this.isLearner) {
      this.sessionService.getUserSessions(this.user.id).subscribe({
        next: (data) => {
          const completed = data.filter((s) => s.status === 'COMPLETED');
          this.completedSessions.set(completed);
          this.fetchUserDetails(completed);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
    } else {
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
                this.reviews.set(r);
                this.fetchReviewerDetails(r);
                this.loading.set(false);
              },
              error: () => {
                this.loading.set(false);
              },
            });
          } else {
            this.loading.set(false);
          }
        },
        error: () => {
          this.loading.set(false);
        },
      });
    }
  }

  private fetchUserDetails(sessions: SessionResponse[]) {
    const userIds = new Set<number>();
    sessions.forEach((s) => {
      userIds.add(s.mentorId);
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
        .subscribe((map) => this.userMap.set(map));
    }
  }

  getMentorName(mentorId: number): string {
    const user = this.userMap().get(mentorId);
    return this.userLookupService.displayName(user);
  }

  getLearnerName(userId: number): string {
    const user = this.userMap().get(userId);
    return this.userLookupService.displayName(user);
  }

  startReview(session: SessionResponse) {
    this.reviewingSession.set(session);
    this.reviewRating.set(5);
    this.reviewComment = '';
  }

  cancelReview() {
    this.reviewingSession.set(null);
  }

  submitReview() {
    const session = this.reviewingSession();
    if (!session) return;
    this.submitting.set(true);
    this.reviewService
      .submit({
        mentorId: session.mentorId,
        userId: this.user.id,
        rating: this.reviewRating(),
        comment: this.reviewComment,
      })
      .subscribe({
        next: (review) => {
          this.myReviews.update((list) => [...list, review]);
          this.reviewingSession.set(null);
          this.submitting.set(false);
        },
        error: () => {
          this.submitting.set(false);
        },
      });
  }

  alreadyReviewed(session: SessionResponse) {
    return this.myReviews().some((r) => r.mentorId === session.mentorId);
  }

  setRating(r: number) {
    this.reviewRating.set(r);
  }

  stars(r: number) {
    return Array.from({ length: 5 }, (_, i) => i + 1 <= r);
  }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  learnerInitials(id: number) {
    return `U${id}`.slice(0, 2);
  }
  learnerColor(id: number) {
    return ['#7c3aed', '#ec4899', '#06b6d4', '#3b82f6', '#22c55e'][id % 5];
  }
}
