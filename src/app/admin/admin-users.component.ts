import { CommonModule } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { rxResource, toSignal } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { Store } from '@ngxs/store'
import { User, UserRole } from '../models/user.model'
import { ToastService } from '../services/toast.service'
import { UserService } from '../services/user.service'
import { AuthState } from '../store/auth.state'

/**
 * AdminUsersComponent using rxResource for declarative async loading.
 *
 * Benefits:
 * - Reload trigger pattern for refreshing after mutations
 * - Computed filtered list that updates reactively
 * - Cleaner code without manual loading state management
 */
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="admin-users">
      <header class="page-header">
        <div class="header-left">
          <a routerLink="/admin" class="back-link">← Retour</a>
          <h1>👥 Gestion des utilisateurs</h1>
        </div>
        <div class="header-right">
          <input
            type="text"
            placeholder="Rechercher..."
            [(ngModel)]="searchQuery"
            (input)="filterUsers()"
            class="search-input"
          />
        </div>
      </header>

      @if (loading()) {
        <div class="loading">Chargement...</div>
      } @else {
        <div class="users-table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Nom d'utilisateur</th>
                <th>Rôle</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of filteredUsers(); track user.id) {
                <tr [class.current-user]="user.id === currentUserId()">
                  <td>{{ user.id }}</td>
                  <td>{{ user.prenom }} {{ user.nom }}</td>
                  <td>{{ user.email }}</td>
                  <td>&#64;{{ user.nomUtilisateur }}</td>
                  <td>
                    <span class="role-badge" [class]="'role-' + (user.role || 'user')">
                      {{ user.role || 'user' }}
                    </span>
                  </td>
                  <td class="actions">
                    @if (user.id !== currentUserId()) {
                      <button
                        class="btn-icon"
                        [title]="user.role === 'admin' ? 'Rétrograder' : 'Promouvoir admin'"
                        (click)="toggleRole(user)"
                      >
                        {{ user.role === 'admin' ? '⬇️' : '⬆️' }}
                      </button>
                      <button
                        class="btn-icon btn-danger"
                        title="Supprimer"
                        (click)="deleteUser(user)"
                      >
                        🗑️
                      </button>
                    } @else {
                      <span class="you-badge">Vous</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="no-data">Aucun utilisateur trouvé</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="summary">
          {{ filteredUsers().length }} utilisateur(s) sur {{ users().length }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .admin-users {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;

        .header-left {
          .back-link {
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
            font-size: 0.9rem;

            &:hover {
              color: white;
            }
          }

          h1 {
            color: white;
            margin: 0.5rem 0 0;
            font-size: 1.75rem;
          }
        }

        .search-input {
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          min-width: 250px;
        }
      }

      .loading {
        text-align: center;
        padding: 3rem;
        color: white;
      }

      .users-table-container {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      }

      .users-table {
        width: 100%;
        border-collapse: collapse;

        th,
        td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        th {
          background: #f7fafc;
          font-weight: 600;
          color: #4a5568;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        tr.current-user {
          background: #ebf8ff;
        }

        .role-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;

          &.role-admin {
            background: #fed7e2;
            color: #97266d;
          }

          &.role-user {
            background: #c6f6d5;
            color: #276749;
          }
        }

        .you-badge {
          font-size: 0.8rem;
          color: #718096;
          font-style: italic;
        }

        .actions {
          display: flex;
          gap: 0.5rem;

          .btn-icon {
            background: none;
            border: none;
            font-size: 1.25rem;
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 4px;
            transition: background 0.2s;

            &:hover {
              background: #edf2f7;
            }

            &.btn-danger:hover {
              background: #fed7d7;
            }
          }
        }

        .no-data {
          text-align: center;
          color: #718096;
          padding: 2rem !important;
        }
      }

      .summary {
        margin-top: 1rem;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.9rem;
        text-align: right;
      }
    `,
  ],
})
export class AdminUsersComponent {
  private readonly userService = inject(UserService)
  private readonly toast = inject(ToastService)
  private readonly store = inject(Store)

  // Current user from store
  private readonly currentUser = toSignal(this.store.select(AuthState.user))
  readonly currentUserId = computed(() => this.currentUser()?.id ?? null)

  // Search state
  searchQuery = ''
  private readonly searchFilter = signal('')

  // Reload trigger for refreshing after mutations
  private readonly reloadTrigger = signal(0)

  // rxResource for users
  readonly usersResource = rxResource({
    params: () => this.reloadTrigger(),
    stream: () => this.userService.getAll(),
  })

  // Convenience computed signals
  readonly users = computed(() => this.usersResource.value() ?? [])
  readonly loading = computed(() => this.usersResource.isLoading())

  // Filtered users based on search query
  readonly filteredUsers = computed(() => {
    const query = this.searchFilter().toLowerCase().trim()
    const allUsers = this.users()
    if (!query) return allUsers

    return allUsers.filter(
      u =>
        u.nom.toLowerCase().includes(query) ||
        u.prenom.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.nomUtilisateur.toLowerCase().includes(query)
    )
  })

  filterUsers(): void {
    this.searchFilter.set(this.searchQuery)
  }

  private reload(): void {
    this.reloadTrigger.update(n => n + 1)
  }

  toggleRole(user: User): void {
    const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin'
    const action = newRole === 'admin' ? 'promouvoir' : 'rétrograder'

    if (!confirm(`Voulez-vous ${action} ${user.prenom} ${user.nom} ?`)) {
      return
    }

    this.userService.update(user.id, { role: newRole } as Partial<User>).subscribe({
      next: () => {
        this.toast.success(`Utilisateur ${newRole === 'admin' ? 'promu admin' : 'rétrogradé'}`)
        this.reload()
      },
      error: () => {
        this.toast.error('Erreur lors de la modification du rôle')
      },
    })
  }

  deleteUser(user: User): void {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer ${user.prenom} ${user.nom} ?\nCette action est irréversible.`
      )
    ) {
      return
    }

    this.userService.delete(user.id).subscribe({
      next: () => {
        this.toast.success('Utilisateur supprimé')
        this.reload()
      },
      error: () => {
        this.toast.error('Erreur lors de la suppression')
      },
    })
  }
}
