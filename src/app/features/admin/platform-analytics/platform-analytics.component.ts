import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { AdminService } from 'src/app/core/services/admin.service';
import { UserDTO } from 'src/app/core/auth/auth.model';
import { MentorResponse } from 'src/app/core/services/mentor.service';

@Component({
  selector: 'app-platform-analytics',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, SkeletonComponent],
  templateUrl: './platform-analytics.component.html',
  styleUrl: './platform-analytics.component.scss',
})
export class PlatformAnalyticsComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<UserDTO[]>([]);
  mentors = signal<MentorResponse[]>([]);
  totalUsersCount = signal(0);
  loading = signal(true);

  mentorUserIds = computed(() => new Set(this.mentors().map((m) => m.userId)));

  // User metrics
  totalUsers = computed(() => this.totalUsersCount());
  learnerCount = computed(
    () =>
      this.users().filter((u) => {
        const r = (u.role || '').toUpperCase();
        const isMentor = this.mentorUserIds().has(u.id) || r.includes('MENTOR');
        const isAdmin = r.includes('ADMIN');
        return !isMentor && !isAdmin && (r.includes('LEARNER') || r === '');
      }).length,
  );
  mentorCount = computed(
    () =>
      this.users().filter((u) => {
        const r = (u.role || '').toUpperCase();
        return this.mentorUserIds().has(u.id) || r.includes('MENTOR');
      }).length,
  );
  adminCount = computed(
    () =>
      this.users().filter((u) => (u.role || '').toUpperCase().includes('ADMIN'))
        .length,
  );

  // Mentor metrics
  activeMentors = computed(
    () => this.mentors().filter((m) => m.status === 'ACTIVE').length,
  );
  pendingMentors = computed(
    () => this.mentors().filter((m) => m.status === 'PENDING').length,
  );
  avgRating = computed(() => {
    const active = this.mentors().filter((m) => m.status === 'ACTIVE');
    if (!active.length) return 0;
    return active.reduce((sum, m) => sum + (m.rating ?? 0), 0) / active.length;
  });
  totalReviews = computed(() =>
    this.mentors().reduce((sum, m) => sum + (m.reviewCount ?? 0), 0),
  );

  // Avg hourly rate
  avgHourlyRate = computed(() => {
    const active = this.mentors().filter((m) => m.status === 'ACTIVE');
    if (!active.length) return 0;
    return (
      active.reduce((sum, m) => sum + (m.hourlyRate ?? 0), 0) / active.length
    );
  });

  // Registration trend (group by month from createdAt)
  registrationByMonth = computed(() => {
    const counts: Record<string, number> = {};
    this.users().forEach((u) => {
      if (!u.createdAt) return;
      const key = new Date(u.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      counts[key] = (counts[key] ?? 0) + 1;
    });
    const entries = Object.entries(counts).slice(-6); // last 6 months
    const max = Math.max(...entries.map((e) => e[1]), 1);
    return entries.map(([label, count]) => ({
      label,
      count,
      pct: (count / max) * 100,
    }));
  });

  // Top skills across mentors
  topSkills = computed(() => {
    const counts: Record<string, number> = {};
    this.mentors().forEach((m) => {
      (m.skills ?? []).forEach((s: string) => {
        counts[s] = (counts[s] ?? 0) + 1;
      });
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count, pct: (count / max) * 100 }));
  });

  kpis = computed(() => [
    {
      label: 'Total Users',
      value: this.totalUsers(),
      icon: 'group',
      color: '#4285f4',
      bg: '#e8f0fe',
    },
    {
      label: 'Active Mentors',
      value: this.activeMentors(),
      icon: 'psychology',
      color: '#7c3aed',
      bg: '#ede9fe',
    },
    {
      label: 'Avg Rating',
      value: this.avgRating().toFixed(1),
      icon: 'star',
      color: '#f9a825',
      bg: '#fff8e1',
    },
    {
      label: 'Total Reviews',
      value: this.totalReviews(),
      icon: 'rate_review',
      color: '#8e24aa',
      bg: '#f3e5f5',
    },
    {
      label: 'Pending Approvals',
      value: this.pendingMentors(),
      icon: 'pending',
      color: '#ec4899',
      bg: '#fce7f3',
    },
    {
      label: 'Avg Hourly Rate',
      value: '₹' + this.avgHourlyRate().toFixed(0),
      icon: 'payments',
      color: '#06b6d4',
      bg: '#cffafe',
    },
  ]);

  ngOnInit() {
    this.adminService.getAllUsers(1000).subscribe({
      next: (data) => {
        const list: UserDTO[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        this.users.set(list);
        this.totalUsersCount.set(data?.totalElements ?? list.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.adminService.getAllMentors().subscribe({
      next: (data: any) => {
        const list: MentorResponse[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        this.mentors.set(list);
      },
      error: () => {},
    });
  }

  stars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
