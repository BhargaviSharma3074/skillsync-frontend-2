import { DecimalPipe, SlicePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import {
  MentorFilters,
  MentorResponse,
  MentorService,
} from 'src/app/core/services/mentor.service';
import {
  SkillResponse,
  SkillService,
} from 'src/app/core/services/skill.service';
import {
  UserBasic,
  UserLookupService,
} from 'src/app/core/services/user-lookup.service';

@Component({
  selector: 'app-find-mentors',
  standalone: true,
  imports: [
    DecimalPipe,
    SlicePipe,
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    SkeletonComponent,
  ],
  templateUrl: './find-mentors.component.html',
  styleUrls: ['./find-mentors.component.scss'],
})
export class FindMentorsComponent implements OnInit {
  private mentorService = inject(MentorService);
  private skillService = inject(SkillService);
  private userLookup = inject(UserLookupService);

  mentors = signal<MentorResponse[]>([]);
  skills = signal<SkillResponse[]>([]);
  userMap = signal(new Map<number, UserBasic>());
  loading = signal(true);
  apiError = signal('');

  filters = signal<MentorFilters>({ sortBy: 'rating' });
  selectedSkillId = signal<number | null>(null);
  minRating = signal<number | null>(null);
  maxRate = signal<number | null>(null);
  searchTerm = signal('');
  filtersOpen = signal(false);

  filteredMentors = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.mentors();
    return this.mentors().filter((m) => {
      const name = this.userLookup
        .displayName(this.userMap().get(m.userId))
        .toLowerCase();
      return (
        name.includes(term) ||
        m.bio?.toLowerCase().includes(term) ||
        m.skills?.some((s) => s.toLowerCase().includes(term))
      );
    });
  });

  get hasActiveFilters() {
    return !!(
      this.selectedSkillId() ||
      this.minRating() ||
      this.maxRate() ||
      this.filters().sortBy !== 'rating'
    );
  }

  ngOnInit() {
    this.skillService.getAll().subscribe({
      next: (skills) => this.skills.set(skills),
      error: () => {},
    });
    this.loadMentors();
  }

  loadMentors() {
    this.loading.set(true);
    this.apiError.set('');

    const f: MentorFilters = { sortBy: this.filters().sortBy };
    if (this.selectedSkillId()) f.skillId = this.selectedSkillId()!;
    if (this.minRating()) f.minRating = this.minRating()!;
    if (this.maxRate()) f.maxRate = this.maxRate()!;

    // Load up to 500 mentors to enable search without pagination limitations
    this.mentorService.getAll(f, 500).subscribe({
      next: (data: any) => {
        const list: MentorResponse[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        this.mentors.set(list);
        this.loading.set(false);
        const ids = list.map((m) => m.userId);
        if (ids.length) {
          this.userLookup
            .batchFetch(ids)
            .subscribe((map) => this.userMap.set(map));
        }
      },
      error: (err) => {
        this.apiError.set(
          err?.error?.message || err?.message || 'Failed to load mentors.',
        );
        this.loading.set(false);
      },
    });
  }

  applyFilters() {
    this.filtersOpen.set(false);
    this.loadMentors();
  }

  clearFilters() {
    this.selectedSkillId.set(null);
    this.minRating.set(null);
    this.maxRate.set(null);
    this.searchTerm.set('');
    this.filters.set({ sortBy: 'rating' });
    this.filtersOpen.set(false);
    this.loadMentors();
  }

  removeFilter(type: 'skill' | 'rating' | 'rate') {
    if (type === 'skill') this.selectedSkillId.set(null);
    if (type === 'rating') this.minRating.set(null);
    if (type === 'rate') this.maxRate.set(null);
    this.loadMentors();
  }

  updateSort(value: string) {
    this.filters.update((f) => ({ ...f, sortBy: value as any }));
    this.loadMentors();
  }

  skillName(id: number): string {
    return this.skills().find((s) => s.id === id)?.name ?? `Skill #${id}`;
  }

  mentorName(mentor: MentorResponse): string {
    return this.userLookup.displayName(this.userMap().get(mentor.userId));
  }

  mentorInitials(mentor: MentorResponse): string {
    const name = this.mentorName(mentor);
    return name === 'Unknown'
      ? `M${mentor.id}`.slice(0, 2).toUpperCase()
      : name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
  }

  avatarColor(mentor: MentorResponse): string {
    const colors = [
      '#e53935',
      '#43a047',
      '#1e88e5',
      '#8e24aa',
      '#f9a825',
      '#00897b',
    ];
    return colors[mentor.id % colors.length];
  }

  stars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
