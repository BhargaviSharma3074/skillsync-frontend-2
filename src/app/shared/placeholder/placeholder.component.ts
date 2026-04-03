import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="placeholder-page">
      <mat-icon class="icon">construction</mat-icon>
      <h2>{{ title }}</h2>
      <p>This feature is coming soon.</p>
    </div>
  `,
  styles: `
    :host { display: block; }
    .placeholder-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 400px;
      gap: 0.75rem;
      color: #9ca3af;
      text-align: center;
    }
    .icon { font-size: 3.5rem; width: 3.5rem; height: 3.5rem; }
    h2 { font-size: 1.25rem; font-weight: 700; color: #374151; margin: 0; }
    p { margin: 0; font-size: 0.875rem; }
  `,
})
export class PlaceholderComponent {
  @Input() title = 'Coming Soon';
}
