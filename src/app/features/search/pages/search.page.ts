import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchBoxComponent } from '../components/search-box.component';
import { SearchResultsComponent } from '../components/search-results.component';
import { SearchService } from '../search.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchBoxComponent, SearchResultsComponent],
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.css']
})
export default class SearchPage {
  query = signal('');
  results = signal<Array<any>>([]);
  total = signal(0);
  // template-friendly filter object for ngModel
  public filtersObj = { author: '', tags: '', since: '', fields: ['title', 'excerpt', 'author', 'tags'] as string[] };

  toggleField(field: string, enabled: boolean) {
    const idx = this.filtersObj.fields.indexOf(field);
    if (enabled && idx === -1) this.filtersObj.fields.push(field);
    if (!enabled && idx !== -1) this.filtersObj.fields.splice(idx, 1);
  }

  constructor(private svc: SearchService) {}

  async onQuery(q: string) {
    this.query.set(q);
    const parsed = {
      author: this.filtersObj.author || undefined,
      tags: this.filtersObj.tags ? this.filtersObj.tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      since: this.filtersObj.since || undefined,
      fields: this.filtersObj.fields && this.filtersObj.fields.length ? this.filtersObj.fields : undefined
    };
    const res = await this.svc.search(q, parsed as any);
    this.results.set(res.items);
    this.total.set(res.total);
  }

  async onSuggest(s: string) {
    await this.onQuery(s);
  }

  async applyFilters() {
    await this.onQuery(this.query());
  }
}
