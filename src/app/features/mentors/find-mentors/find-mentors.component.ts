import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MentorFilters, MentorResponse, MentorService } from 'src/app/core/services/mentor.service';
import { SkillResponse, SkillService } from 'src/app/core/services/skill.service';

@Component({
  selector: 'app-find-mentors',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCard
  ],
  templateUrl: './find-mentors.component.html',
  styleUrls: ['./find-mentors.component.scss'],  // ← fix: styleUrl → styleUrls
})
export class FindMentorsComponent implements OnInit {
  private mentorService = inject(MentorService);
  private skillService  = inject(SkillService);

  // ── Reactive state via Signals ──
  mentors  = signal<MentorResponse[]>([]);
  skills   = signal<SkillResponse[]>([]);
  loading  = signal(true);
  apiError = signal('');

  filters         = signal<MentorFilters>({ sortBy: 'rating' });
  selectedSkillId = signal<number | null>(null);
  minRating       = signal<number | null>(null);
  maxRate         = signal<number | null>(null);
  searchTerm      = signal('');

  // ── Computed (auto-updates when mentors or searchTerm change) ──
  filteredMentors = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.mentors();
    return this.mentors().filter(m =>
      m.bio?.toLowerCase().includes(term) ||
      m.skills?.some(s => s.toLowerCase().includes(term))
    );
  });

  ngOnInit() {
    this.skillService.getAll().subscribe({
      next: skills => this.skills.set(skills),
      error: () => {},
    });
    this.loadMentors();
  }

  loadMentors() {
    this.loading.set(true);
    this.apiError.set('');

    const f: MentorFilters = { sortBy: this.filters().sortBy };
    if (this.selectedSkillId()) f.skillId   = this.selectedSkillId()!;
    if (this.minRating())       f.minRating = this.minRating()!;
    if (this.maxRate())         f.maxRate   = this.maxRate()!;

    this.mentorService.getAll(f).subscribe({
      next: (data: any) => {
        this.mentors.set(Array.isArray(data) ? data : (data?.content ?? []));
        this.loading.set(false);
      },
      error: (err) => {
        this.apiError.set(err?.error?.message || err?.message || 'Failed to load mentors.');
        this.loading.set(false);
      },
    });
  }

  clearFilters() {
    this.selectedSkillId.set(null);
    this.minRating.set(null);
    this.maxRate.set(null);
    this.searchTerm.set('');
    this.filters.set({ sortBy: 'rating' });
    this.loadMentors();
  }

  mentorInitials(mentor: MentorResponse): string {
    return `M${mentor.id}`;
  }

  avatarColor(mentor: MentorResponse): string {
    const colors = ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#f9a825', '#00897b'];
    return colors[mentor.id % colors.length];
  }

  stars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
