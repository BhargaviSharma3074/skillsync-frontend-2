import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './core/ui/toast/toast.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet />
    <app-toast />
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class App {
  constructor() {
    // Initialize theme service to load saved theme from localStorage
    inject(ThemeService);
  }
}
