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

    this.http.patch<User>(API.users.updateMe, updates, {
      headers: { Authorization: `Bearer ${this.authService.getToken()}` }
    }).subscribe({
      next: (updatedUser) => {
        this.authService.updateUser(updatedUser);
        this.isEditing.set(false);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to update profile');
        this.isLoading.set(false);
      }
    });
  }

  onCancel() {
    this.isEditing.set(false);
    this.profileForm.reset();
    this.errorMessage.set('');

  }
}