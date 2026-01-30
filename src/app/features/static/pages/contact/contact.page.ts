import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'drafts-contact-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage {
  readonly email = 'rt4@mail.com';
  readonly lat = 36.84300340269386;
  readonly lon = 10.19701016824531;

  get mapUrl(): string {
    return `https://www.openstreetmap.org/?mlat=${this.lat}&mlon=${this.lon}#map=18/${this.lat}/${this.lon}`;
  }
}
