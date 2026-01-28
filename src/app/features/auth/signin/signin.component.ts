import { Component, signal, computed } from '@angular/core';
import { inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.css'
})
export class SigninComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  
  errorMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);
  
  canSubmit = computed(() => this.signinForm.valid && !this.isSubmitting());
  
  signinForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    if (this.signinForm.invalid) {
      this.signinForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.login(this.signinForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/articles']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.message || 'Invalid email or password');
      }
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.signinForm.get(field);
    return !!(control?.hasError(error) && control?.touched);
  }
}