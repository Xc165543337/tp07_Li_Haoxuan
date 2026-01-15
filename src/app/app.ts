import { CommonModule } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { Store } from '@ngxs/store'
import { PollutionDeclaration } from './models/pollution.model'
import { Logout } from './store/auth.actions'
import { AuthState } from './store/auth.state'
import { BookmarkState } from './store/bookmark.state'
import { ToastContainerComponent } from './toast/toast-container.component'

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.less',
})
export class App {
  protected readonly title = signal('Déclaration de Pollution')
  showForm = signal(true)
  declaration = signal<PollutionDeclaration | null>(null)
  private readonly router = inject(Router)
  private readonly store = inject(Store)

  // Convert NGXS observables to signals
  user = toSignal(this.store.select(AuthState.user))
  isAuthenticated = toSignal(this.store.select(AuthState.isAuthenticated), { initialValue: false })
  bookmarkCount = toSignal(this.store.select(BookmarkState.bookmarkCount), { initialValue: 0 })

  // Computed signal for admin check
  isAdmin = computed(() => this.user()?.role === 'admin')

  onFormSubmitted(declaration: PollutionDeclaration): void {
    this.declaration.set(declaration)
    this.showForm.set(false)
  }

  resetForm(): void {
    this.declaration.set(null)
    this.showForm.set(true)
  }

  logout(): void {
    this.store.dispatch(new Logout())
    void this.router.navigateByUrl('/login')
  }
}
