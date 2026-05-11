import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { AdminService } from 'src/app/core/services/admin.service';
import { AuthService } from 'src/app/core/auth/auth.service';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { MentorResponse } from 'src/app/core/services/mentor.service';

@Component({
  selector: 'app-mentor-approvals',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    SkeletonComponent,
  ],
  templateUrl: './mentor-approvals.component.html',
  styleUrl: './mentor-approvals.component.scss',
})
export class MentorApprovalsComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);

  mentors = signal<MentorResponse[]>([]);
  loading = signal(true);
  error = signal(false);
  actionInProgress = signal<number | null>(null);
  toastMsg = signal<string | null>(null);

  pending = computed(() =>
    this.mentors().filter((m) => m.status === 'PENDING'),
  );
  active = computed(() => this.mentors().filter((m) => m.status === 'ACTIVE'));
  rejected = computed(() =>
    this.mentors().filter((m) => m.status === 'REJECTED'),
  );

  ngOnInit() {
    this.adminService.getAllMentors().subscribe({
      next: (data: any) => {
        const list: MentorResponse[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        this.mentors.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  approve(mentor: MentorResponse) {
    this.actionInProgress.set(mentor.id);
    this.adminService.approveMentor(mentor.id).subscribe({
      next: () => {
        this.mentors.update((list) =>
          list.map((m) =>
            m.id === mentor.id ? { ...m, status: 'ACTIVE' } : m,
          ),
        );
        this.authService.fetchProfile().subscribe();
        this.showToast('Mentor approved successfully.');
        this.actionInProgress.set(null);
      },
      error: () => {
        this.showToast('Failed to approve mentor.');
        this.actionInProgress.set(null);
      },
    });
  }

  reject(mentor: MentorResponse) {
    this.actionInProgress.set(mentor.id);
    this.adminService.rejectMentor(mentor.id).subscribe({
      next: () => {
        this.mentors.update((list) =>
          list.map((m) =>
            m.id === mentor.id ? { ...m, status: 'REJECTED' } : m,
          ),
        );
        this.authService.fetchProfile().subscribe();
        this.showToast('Mentor application rejected.');
        this.actionInProgress.set(null);
      },
      error: () => {
        this.showToast('Failed to reject mentor.');
        this.actionInProgress.set(null);
      },
    });
  }

  private showToast(msg: string) {
    this.toastMsg.set(msg);
    setTimeout(() => this.toastMsg.set(null), 3000);
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: '#065f46',
      PENDING: '#92400e',
      REJECTED: '#991b1b',
    };
    return map[status] ?? '#374151';
  }

  statusBg(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: '#d1fae5',
      PENDING: '#fef3c7',
      REJECTED: '#fee2e2',
    };
    return map[status] ?? '#f3f4f6';
  }

  mentorName(mentor: MentorResponse): string {
    return mentor.name || mentor.username || `Mentor #${mentor.id}`;
  }

  avatarColor(id: number): string {
    const colors = [
      '#7c3aed',
      '#ec4899',
      '#06b6d4',
      '#3b82f6',
      '#22c55e',
      '#f59e0b',
    ];
    return colors[id % colors.length];
  }

  stars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
