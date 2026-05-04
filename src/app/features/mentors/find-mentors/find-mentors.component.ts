// import { DecimalPipe, SlicePipe } from '@angular/common';
// import { Component, OnInit, computed, inject, signal } from '@angular/core';
// import { FormsModule } from '@angular/forms';
// import { MatButtonModule } from '@angular/material/button';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatIconModule } from '@angular/material/icon';
// import { MatInputModule } from '@angular/material/input';
// import { MatSelectModule } from '@angular/material/select';
// import { RouterLink } from '@angular/router';
// import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
// import { MatDialog, MatDialogModule } from '@angular/material/dialog';
// import {
//   MentorFilters,
//   MentorResponse,
//   MentorService,
// } from 'src/app/core/services/mentor.service';
// import {
//   SkillResponse,
//   SkillService,
// } from 'src/app/core/services/skill.service';
// import {
//   UserBasic,
//   UserLookupService,
// } from 'src/app/core/services/user-lookup.service';
// import { MentorViewDialogComponent } from '../mentor-view-dialog/mentor-view-dialog.component';
// import { Subject } from 'rxjs';

// @Component({
//   selector: 'app-find-mentors',
//   standalone: true,
//   imports: [
//     DecimalPipe,
//     SlicePipe,
//     FormsModule,
//     RouterLink,
//     MatFormFieldModule,
//     MatInputModule,
//     MatSelectModule,
//     MatButtonModule,
//     MatDialogModule,
//     MatIconModule,
//     SkeletonComponent,
//   ],
//   templateUrl: './find-mentors.component.html',
//   styleUrls: ['./find-mentors.component.scss'],
// })
// export class FindMentorsComponent implements OnInit {
//   private mentorService = inject(MentorService);
//   private skillService = inject(SkillService);
//   private userLookup = inject(UserLookupService);
//   private dialog = inject(MatDialog);
//   private destroy$ = new Subject<void>();

//   mentors = signal<MentorResponse[]>([]);
//   skills = signal<SkillResponse[]>([]);
//   userMap = signal(new Map<number, UserBasic>());
//   loading = signal(true);
//   apiError = signal('');

//   filters = signal<MentorFilters>({ sortBy: 'rating' });
//   selectedSkillId = signal<number | null>(null);
//   minRating = signal<number | null>(null);
//   maxRate = signal<number | null>(null);
//   searchTerm = signal('');
//   filtersOpen = signal(false);

//   currentPage = signal(1);
//   pageSize = signal(12);

//   filteredMentors = computed(() => {
//     const term = this.searchTerm().trim().toLowerCase();
//     if (!term) return this.mentors();
//     return this.mentors().filter((m) => {
//       const name = this.userLookup
//         .displayName(this.userMap().get(m.userId))
//         .toLowerCase();
//       return (
//         name.includes(term) ||
//         m.bio?.toLowerCase().includes(term) ||
//         m.skills?.some((s) => s.toLowerCase().includes(term))
//       );
//     });
//   });

//   totalPages = computed(() => {
//     const total = this.filteredMentors().length;
//     const size = this.pageSize();
//     return Math.ceil(total / size);
//   });

//   paginatedMentors = computed(() => {
//     const start = (this.currentPage() - 1) * this.pageSize();
//     const end = start + this.pageSize();
//     return this.filteredMentors().slice(start, end);
//   });

//   get hasActiveFilters() {
//     return !!(
//       this.selectedSkillId() ||
//       this.minRating() ||
//       this.maxRate() ||
//       this.filters().sortBy !== 'rating'
//     );
//   }

//   ngOnInit() {
//     this.skillService.getAll().subscribe({
//       next: (skills) => this.skills.set(skills),
//       error: () => {},
//     });
//     this.loadMentors();
//   }

//   loadMentors() {
//     this.loading.set(true);
//     this.apiError.set('');

//     const f: MentorFilters = { sortBy: this.filters().sortBy };
//     if (this.selectedSkillId()) f.skillId = this.selectedSkillId()!;
//     if (this.minRating()) f.minRating = this.minRating()!;
//     if (this.maxRate()) f.maxRate = this.maxRate()!;

//     // Load up to 500 mentors to enable search without pagination limitations
//     this.mentorService.getAll(f, 500).subscribe({
//       next: (data: any) => {
//         const list: MentorResponse[] = Array.isArray(data)
//           ? data
//           : (data?.content ?? []);
//         this.mentors.set(list);
//         this.loading.set(false);
//         const ids = list.map((m) => m.userId);
//         if (ids.length) {
//           this.userLookup
//             .batchFetch(ids)
//             .subscribe((map) => this.userMap.set(map));
//         }
//       },
//       error: (err) => {
//         this.apiError.set(
//           err?.error?.message || err?.message || 'Failed to load mentors.',
//         );
//         this.loading.set(false);
//       },
//     });
//   }

//   applyFilters() {
//     this.filtersOpen.set(false);
//     this.currentPage.set(1);
//     this.loadMentors();
//   }

//   clearFilters() {
//     this.selectedSkillId.set(null);
//     this.minRating.set(null);
//     this.maxRate.set(null);
//     this.searchTerm.set('');
//     this.filters.set({ sortBy: 'rating' });
//     this.filtersOpen.set(false);
//     this.currentPage.set(1);
//     this.loadMentors();
//   }

//   removeFilter(type: 'skill' | 'rating' | 'rate') {
//     if (type === 'skill') this.selectedSkillId.set(null);
//     if (type === 'rating') this.minRating.set(null);
//     if (type === 'rate') this.maxRate.set(null);
//     this.currentPage.set(1);
//     this.loadMentors();
//   }

//   updateSort(value: string) {
//     this.filters.update((f) => ({ ...f, sortBy: value as any }));
//     this.currentPage.set(1);
//     this.loadMentors();
//   }

//   goToPage(page: number) {
//     if (page >= 1 && page <= this.totalPages()) {
//       this.currentPage.set(page);
//     }
//   }

//   nextPage() {
//     if (this.currentPage() < this.totalPages()) {
//       this.currentPage.update((p) => p + 1);
//     }
//   }

//   prevPage() {
//     if (this.currentPage() > 1) {
//       this.currentPage.update((p) => p - 1);
//     }
//   }

//   skillName(id: number): string {
//     return this.skills().find((s) => s.id === id)?.name ?? `Skill #${id}`;
//   }

//   mentorName(mentor: MentorResponse): string {
//     return this.userLookup.displayName(this.userMap().get(mentor.userId));
//   }

//   mentorInitials(mentor: MentorResponse): string {
//     const name = this.mentorName(mentor);
//     return name === 'Unknown'
//       ? `M${mentor.id}`.slice(0, 2).toUpperCase()
//       : name
//           .split(' ')
//           .map((n) => n[0])
//           .join('')
//           .toUpperCase()
//           .slice(0, 2);
//   }

//   openView(mentor: MentorResponse) {
//     this.dialog.open(MentorViewDialogComponent, {
//       data: {
//         mentor,
//         user: this.userMap().get(mentor.userId),
//         avatarColor: this.avatarColor(mentor),
//         initials: this.mentorInitials(mentor),
//       },
//       panelClass: 'mentor-view-panel',
//       maxWidth: '95vw',
//       autoFocus: false,
//     });
//   }

//   avatarColor(mentor: MentorResponse): string {
//     const colors = [
//       '#7c3aed',
//       '#ec4899',
//       '#06b6d4',
//       '#3b82f6',
//       '#22c55e',
//       '#f43f5e',
//     ];
//     return colors[mentor.id % colors.length];
//   }

//   stars(rating: number) {
//     return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
//   }

//   Math = Math;

//   $pagination = (totalPages: number): number[] => {
//     const pages: number[] = [];
//     for (let i = 1; i <= totalPages; i++) {
//       pages.push(i);
//     }
//     return pages;
//   };
// }

import { DecimalPipe, SlicePipe } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
import { MentorViewDialogComponent } from '../mentor-view-dialog/mentor-view-dialog.component';

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
    MatDialogModule,
    MatIconModule,
    SkeletonComponent,
  ],
  templateUrl: './find-mentors.component.html',
  styleUrls: ['./find-mentors.component.scss'],
})
export class FindMentorsComponent implements OnInit, OnDestroy {
  private mentorService = inject(MentorService);
  private skillService = inject(SkillService);
  private userLookup = inject(UserLookupService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  mentors = signal<MentorResponse[]>([]);
  skills = signal<SkillResponse[]>([]);
  userMap = signal(new Map<number, UserBasic>());
  loading = signal(true);
  apiError = signal('');

  // Pagination
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  readonly pageSize = 12;

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages: (number | '...')[] = [];
    if (cur <= 3) {
      pages.push(0, 1, 2, 3, 4, '...', total - 1);
    } else if (cur >= total - 4) {
      pages.push(
        0,
        '...',
        total - 5,
        total - 4,
        total - 3,
        total - 2,
        total - 1,
      );
    } else {
      pages.push(0, '...', cur - 1, cur, cur + 1, '...', total - 1);
    }
    return pages;
  });

  filters = signal<MentorFilters>({ sortBy: 'rating' });
  selectedSkillId = signal<number | null>(null);
  minRating = signal<number | null>(null);
  maxRate = signal<number | null>(null);
  searchTerm = signal('');
  filtersOpen = signal(false);

  // Local name/bio/skill search within the current page
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
    this.skillService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (skills) => this.skills.set(skills) });
    this.loadMentors();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMentors(page = this.currentPage()) {
    this.loading.set(true);
    this.apiError.set('');

    const f: MentorFilters = { sortBy: this.filters().sortBy };
    if (this.selectedSkillId()) f.skillId = this.selectedSkillId()!;
    if (this.minRating()) f.minRating = this.minRating()!;
    if (this.maxRate()) f.maxRate = this.maxRate()!;

    this.mentorService
      .getAll(f, page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.mentors.set(data.content);
          this.currentPage.set(data.number);
          this.totalPages.set(data.totalPages);
          this.totalElements.set(data.totalElements);
          this.loading.set(false);
          const ids = data.content.map((m) => m.userId);
          if (ids.length) {
            this.userLookup
              .batchFetch(ids)
              .pipe(takeUntil(this.destroy$))
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

  goToPage(page: number | '...') {
    if (page === '...') return;
    if (page < 0 || page >= this.totalPages()) return;
    this.loadMentors(page);
  }

  applyFilters() {
    this.filtersOpen.set(false);
    this.currentPage.set(0);
    this.loadMentors(0);
  }

  clearFilters() {
    this.selectedSkillId.set(null);
    this.minRating.set(null);
    this.maxRate.set(null);
    this.searchTerm.set('');
    this.filters.set({ sortBy: 'rating' });
    this.filtersOpen.set(false);
    this.currentPage.set(0);
    this.loadMentors(0);
  }

  removeFilter(type: 'skill' | 'rating' | 'rate') {
    if (type === 'skill') this.selectedSkillId.set(null);
    if (type === 'rating') this.minRating.set(null);
    if (type === 'rate') this.maxRate.set(null);
    this.currentPage.set(0);
    this.loadMentors(0);
  }

  updateSort(value: string) {
    this.filters.update((f) => ({ ...f, sortBy: value }));
    this.currentPage.set(0);
    this.loadMentors(0);
  }

  get rangeStart() {
    return this.currentPage() * this.pageSize + 1;
  }
  get rangeEnd() {
    return Math.min(
      (this.currentPage() + 1) * this.pageSize,
      this.totalElements(),
    );
  }

  openView(mentor: MentorResponse) {
    this.dialog.open(MentorViewDialogComponent, {
      data: {
        mentor,
        user: this.userMap().get(mentor.userId),
        avatarColor: this.avatarColor(mentor),
        initials: this.mentorInitials(mentor),
      },
      panelClass: 'mentor-view-panel',
      maxWidth: '95vw',
      autoFocus: false,
    });
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
