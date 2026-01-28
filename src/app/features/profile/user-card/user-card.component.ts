import { Component, input } from '@angular/core';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [],
  templateUrl: './user-card.component.html',
  styleUrl: './user-card.component.css'
})
export class UserCardComponent {
  user = input.required<User>();
}