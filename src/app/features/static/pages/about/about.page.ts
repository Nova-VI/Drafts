import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'drafts-about-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.page.html',
  styleUrl: './about.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  readonly year = new Date().getFullYear();
}
