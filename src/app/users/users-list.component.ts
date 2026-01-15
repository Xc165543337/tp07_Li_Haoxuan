import { CommonModule } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { rxResource } from '@angular/core/rxjs-interop'
import { RouterLink } from '@angular/router'
import { UserService } from '../services/user.service'

/**
 * UsersListComponent using rxResource for declarative async loading.
 *
 * Benefits:
 * - Automatic loading/error state via .isLoading() and .error()
 * - .reload() method for manual refresh
 * - No ngOnInit needed - resource loads automatically
 * - Cleaner code without manual subscriptions
 */
@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.less',
})
export class UsersListComponent {
  private readonly userService = inject(UserService)

  // Trigger signal for reload capability
  private readonly reloadTrigger = signal(0)

  // rxResource with reload capability
  readonly usersResource = rxResource({
    params: () => this.reloadTrigger(),
    stream: () => this.userService.getAll(),
  })

  // Convenience computed signals
  readonly users = computed(() => this.usersResource.value() ?? [])
  readonly loading = computed(() => this.usersResource.isLoading())
  readonly error = computed(() => {
    const err = this.usersResource.error() as { error?: { message?: string } } | null
    return err?.error?.message ?? (err ? 'Impossible de charger les utilisateurs' : null)
  })

  // Manual reload method
  reload(): void {
    this.reloadTrigger.update(n => n + 1)
  }
}
