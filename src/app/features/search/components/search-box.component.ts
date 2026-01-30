import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../search.service';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.css']
})
export class SearchBoxComponent {
  @Output() query = new EventEmitter<string>();
  @Output() suggestSelected = new EventEmitter<string>();

  public value = signal('');
  public suggestions: string[] = [];

  constructor(private svc: SearchService) {}

  async onInput(v: string) {
    this.value.set(v);
    this.query.emit(v);
    this.suggestions = await this.svc.suggestions(v);
  }

  chooseSuggestion(s: string) {
    this.value.set(s);
    this.suggestSelected.emit(s);
    this.query.emit(s);
    this.suggestions = [];
  }
}
