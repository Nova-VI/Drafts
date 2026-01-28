import { Component, HostBinding, HostListener, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NgIf, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isMobileMenuOpen = false;

  private lastScroll = 0;
  private minHideScroll = 10;
  
  @HostBinding('class.hidden') isHidden = false;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // mobile-only behavior
    const w = window as any;
    if (!w) return;
    const width = w.innerWidth || document.documentElement.clientWidth;
    if (width > 768) {
      // visible on larger screens
      this.isHidden = false;
      this.lastScroll = w.scrollY || 0;
      return;
    }

    const current = w.scrollY || 0;

    if (current <= 10) {
      this.isHidden = false;
    } else if (current > this.lastScroll && current > this.minHideScroll) {
      this.isHidden = true;
    } else if (current < this.lastScroll) {
      this.isHidden = false;
    }

    this.lastScroll = current;
    this.updateBodyClass();
  }

  @HostListener('window:resize', [])
  onWindowResize() {
    // reset state on resize
    const w = window as any;
    if (!w) return;
    const width = w.innerWidth || document.documentElement.clientWidth;
    if (width > 768) this.isHidden = false;
    this.updateBodyClass();
  }

  ngOnInit(): void {
    this.updateBodyClass();
  }

  private updateBodyClass() {
    const body = document && document.body;
    if (!body) return;
    if (this.isHidden) body.classList.add('nav-hidden');
    else body.classList.remove('nav-hidden');
  }
}
