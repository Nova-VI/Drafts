import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API } from '../../../core/api/api.endpoints';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  currentUser = this.authService.currentUser;
  isEditing = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  profileForm = this.fb.nonNullable.group({
    name: [''],
    lastName: [''],
    bio: ['', [Validators.maxLength(200)]]
  });

  canSave = computed(() => 
    this.profileForm.valid && !this.isLoading()
  );

  toggleEditMode(): void {
    if (!this.isEditing()) {
      const user = this.currentUser();
      if (user) {
        this.profileForm.patchValue({
          name: user.name || '',
          lastName: user.lastName || '',
          bio: user.bio || ''
        });
      }
    }
    this.isEditing.update(v => !v);
  }

  onSave(): void {
  if (!this.canSave()) return;

  this.isLoading.set(true);
  this.errorMessage.set('');

  const updates = this.profileForm.getRawValue();

  // Interceptor automatically adds Authorization header
  this.http.patch<User>(API.users.updateMe, updates).subscribe({
    next: (updatedUser) => {
      this.authService.updateUser(updatedUser);
      this.isEditing.set(false);
      this.isLoading.set(false);
      this.successMessage.set('✓ Saved');
      setTimeout(() => this.successMessage.set(''), 2000);
    },
    error: (err) => {
      // errorInterceptor now provides clean error.message
      this.errorMessage.set(err.message || 'Failed to update profile');
      this.isLoading.set(false);
    }
  });
}

  onCancel() {
    this.isEditing.set(false);
    this.profileForm.reset();
    this.errorMessage.set('');
    this.successMessage.set('');

  }
}