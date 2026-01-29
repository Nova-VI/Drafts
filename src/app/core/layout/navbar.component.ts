import { Component, HostBinding, HostListener, OnInit, inject, ElementRef, Renderer2 } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NgIf, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isMobileMenuOpen = false;
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private router = inject(Router);

  // expose auth signals to template
  public auth = inject(AuthService);

  private lastScroll = 0;
  private minHideScroll = 10;
  
  @HostBinding('class.hidden') isHidden = false;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) this.focusFirstMenuItem();
    else this.returnFocusToToggle();
    this.updateBodyClass();
  }

  public onNavLinkClick(evt: Event): void {
    // links inside menu should close menu on mobile and return focus
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      this.updateBodyClass();
      this.returnFocusToToggle();
    }
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

  // keyboard handling: Escape to close; Arrow navigation and focus trap
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(e: KeyboardEvent) {
    if (!this.isMobileMenuOpen) return;

    const key = e.key;
    const menu = this.el.nativeElement.querySelector('#nav-menu');
    if (!menu) return;

    const items: HTMLElement[] = Array.from(menu.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
    if (!items.length) return;

    const active = document.activeElement as HTMLElement;
    const idx = items.indexOf(active as HTMLElement);

    if (key === 'Escape') {
      e.preventDefault();
      this.isMobileMenuOpen = false;
      this.updateBodyClass();
      this.returnFocusToToggle();
      return;
    }

    if (key === 'ArrowDown' || key === 'Down') {
      e.preventDefault();
      const next = idx < items.length - 1 ? items[idx + 1] : items[0];
      next.focus();
      return;
    }

    if (key === 'ArrowUp' || key === 'Up') {
      e.preventDefault();
      const prev = idx > 0 ? items[idx - 1] : items[items.length - 1];
      prev.focus();
      return;
    }

    if (key === 'Tab') {
      // simple focus trap within menu while open
      if (items.length === 0) return;
      if (e.shiftKey) {
        if (active === items[0]) {
          e.preventDefault();
          items[items.length - 1].focus();
        }
      } else {
        if (active === items[items.length - 1]) {
          e.preventDefault();
          items[0].focus();
        }
      }
    }
  }

  ngOnInit(): void {
    this.updateBodyClass();
    // close menu on route navigation
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd && this.isMobileMenuOpen) {
        this.isMobileMenuOpen = false;
        this.updateBodyClass();
        this.returnFocusToToggle();
      }
    });
  }

  signOut(): void {
    this.auth.logout();
  }

  private updateBodyClass() {
    const body = document && document.body;
    if (!body) return;
    if (this.isHidden) body.classList.add('nav-hidden');
    else body.classList.remove('nav-hidden');
  }

  private focusFirstMenuItem() {
    const menu = this.el.nativeElement.querySelector('#nav-menu');
    if (!menu) return;
    const first = menu.querySelector('[role="menuitem"]') as HTMLElement | null;
    if (first) {
      // small delay so element is focusable after open animation
      setTimeout(() => first.focus(), 40);
    }
  }

  private returnFocusToToggle() {
    const btn = this.el.nativeElement.querySelector('#nav-toggle') as HTMLElement | null;
    if (btn) btn.focus();
  }
}
