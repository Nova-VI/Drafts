import { Component, signal, computed } from '@angular/core';
import { inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  
  errorMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);
  
  canSubmit = computed(() => this.signupForm.valid && !this.isSubmitting());
  
  signupForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: this.passwordMatchValidator
  });

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const { confirmPassword, ...registerData } = this.signupForm.value;

    this.authService.register(registerData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/articles']);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.error?.message || 'Registration failed');
      }
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.signupForm.get(field);
    return !!(control?.hasError(error) && control?.touched);
  }

  hasFormError(error: string): boolean {
    const confirmPasswordControl = this.signupForm.get('confirmPassword');
    return !!(this.signupForm.hasError(error) && confirmPasswordControl?.touched);
  }
}