import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API } from '../../../core/api/api.endpoints';
import { User } from '../../../core/models/user.model';
import { of } from 'rxjs';

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
  private route = inject(ActivatedRoute);

  currentUser = this.authService.currentUser;
  
  // Profile user - either from route param or current user
  profileUser = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('username')),
      switchMap(username => {
        if (!username) {
          // No username in route, show current user
          return of(this.currentUser());
        }
        // Fetch user by username
        return this.http.get<User>(API.users.byUsername(username));
      })
    )
  );

  isOwnProfile = computed(() => {
    const current = this.currentUser();
    const profile = this.profileUser();
    return current && profile && current.id === profile.id;
  });

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
    if (!this.isOwnProfile()) return; // Only allow editing own profile
    
    if (!this.isEditing()) {
      const user = this.profileUser();
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