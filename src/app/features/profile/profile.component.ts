import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  get user() { return this.authService.currentUser!; }

  editing  = signal(false);
  saving   = signal(false);
  success  = signal(false);
  errorMsg = signal('');

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    name:     [''],
    email:    ['', [Validators.required, Validators.email]],
  });

  ngOnInit() {
    this.form.patchValue({
      username: this.user.username,
      name:     this.user.name,
      email:    this.user.email,
    });
  }

  startEdit() {
    this.editing.set(true);
    this.success.set(false);
    this.errorMsg.set('');
  }

  cancelEdit() {
    this.editing.set(false);
    this.form.patchValue({ username: this.user.username, name: this.user.name, email: this.user.email });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMsg.set('');
    this.authService.updateProfile(this.form.value as any).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message || 'Failed to update profile.');
      },
    });
  }

  get roleLabel() {
    return this.user.role.charAt(0) + this.user.role.slice(1).toLowerCase();
  }

  get userInitials() {
    const name = this.user.name || this.user.username || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  get joinedDate() {
    return new Date(this.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}
