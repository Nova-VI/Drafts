import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'drafts-privacy-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy.page.html',
  styleUrl: './privacy.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPage {
  readonly year = new Date().getFullYear();
}
