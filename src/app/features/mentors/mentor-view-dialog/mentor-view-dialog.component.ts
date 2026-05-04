import { Component, Inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MentorResponse } from 'src/app/core/services/mentor.service';
import { UserBasic } from 'src/app/core/services/user-lookup.service';

export interface MentorViewDialogData {
  mentor: MentorResponse;
  user: UserBasic | undefined;
  avatarColor: string;
  initials: string;
}

@Component({
  selector: 'app-mentor-view-dialog',
  standalone: true,
  imports: [CommonModule, DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './mentor-view-dialog.component.html',
  styleUrls: ['./mentor-view-dialog.component.scss'],
})
export class MentorViewDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MentorViewDialogData,
    private dialogRef: MatDialogRef<MentorViewDialogComponent>,
    private router: Router,
  ) {}

  get mentor() { return this.data.mentor; }
  get user()   { return this.data.user; }

  get isAvailable(): boolean {
    const av = this.mentor.availability ?? '';
    return av.trim().length > 0;
  }

  stars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  book() {
    this.dialogRef.close();
    this.router.navigate(['/book-session', this.mentor.id]);
  }

  close() { this.dialogRef.close(); }
}
