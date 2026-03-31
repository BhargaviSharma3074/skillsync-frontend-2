import { CommonModule} from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms"
import { AuthService } from "src/app/core/auth/auth.service";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule,CommonModule],
  templateUrl: './login.component.html',
})

export class LoginComponent{
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loginForm = this.fb.group({
    email: ['',[Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = false;
  errorMessage = '';

  get email() {return this.loginForm.get('email')!;};
  get password() {return this.loginForm.get('password')!;}

  onSubmit(): void{
    if(this.loginForm.invalid) return;

  this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value as any).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.loading = false;
      },
    });
  }
}
