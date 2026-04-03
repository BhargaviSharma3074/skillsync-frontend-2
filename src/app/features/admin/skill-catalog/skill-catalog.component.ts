import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService } from 'src/app/core/services/admin.service';
import { SkillService, SkillResponse } from 'src/app/core/services/skill.service';
import { MatCard } from '@angular/material/card';

@Component({
  selector: 'app-manage-skills',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    MatCard
  ],
  templateUrl: './skill-catalog.component.html',
  styleUrls: ['./skill-catalog.component.scss']
})
export class SkillCatalogComponent implements OnInit {
  private adminService = inject(AdminService);
  private skillService = inject(SkillService);
  private snackBar = inject(MatSnackBar);

  skills = signal<SkillResponse[]>([]);

  // Stats for the header
  totalSkills = computed(() => this.skills().length);
  categoriesCount = computed(() => new Set(this.skills().map(s => s.category)).size);

  displayedColumns: string[] = ['skill', 'category', 'actions'];

  newSkill = { name: '', category: '' };
  categories = ['Frontend', 'Backend', 'DevOps', 'Mobile', 'Data Science', 'UI/UX'];

  ngOnInit() {
    this.loadSkills();
  }

  loadSkills() {
    this.skillService.getAll().subscribe({
      next: (data) => {
        // The spread operator [...] forces the Material Table to recognize a data change
        this.skills.set([...data]);
      },
      error: (err) => {
        console.error('Failed to fetch skills:', err);
      }
    });
  }

  onAddSkill() {
    if (!this.newSkill.name || !this.newSkill.category) return;
    this.adminService.addSkill(this.newSkill).subscribe({
      next: () => {
        this.snackBar.open('Skill added successfully', 'OK', { duration: 2000 });
        this.newSkill = { name: '', category: '' };
        this.loadSkills();
      }
    });
  }

  onDelete(id: number) {
    if (confirm('Delete this skill?')) {
      this.adminService.deleteSkill(id).subscribe({
        next: () => {
          this.snackBar.open('Skill deleted successfully', 'OK', { duration: 2000 });
          this.loadSkills(); // Refresh the list
        },
        error: (err) => {
          console.error('Delete error:', err);

          // Show a message to the user instead of failing silently
          this.snackBar.open('Failed to delete skill. It might be assigned to a mentor.', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });

          // Force a reload anyway just in case our local state is out of sync
          this.loadSkills();
        }
      });
    }
  }
}
