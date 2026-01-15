import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { rxResource, toSignal } from '@angular/core/rxjs-interop'
import { RouterLink } from '@angular/router'
import { Store } from '@ngxs/store'
import { forkJoin, map } from 'rxjs'
import { PollutionService } from '../services/pollution.service'
import { UserService } from '../services/user.service'
import { AuthState } from '../store/auth.state'

interface DashboardStats {
  totalUsers: number
  totalPollutions: number
  pollutionsByLevel: Record<string, number>
  recentPollutions: number
}

/**
 * AdminDashboardComponent using rxResource for declarative async loading.
 *
 * Benefits:
 * - Single rxResource handles combined data loading
 * - Computed signals for derived stats
 * - Automatic loading state management
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="admin-dashboard">
      <header class="dashboard-header">
        <h1>🛡️ Administration</h1>
        <p>Bienvenue, {{ userName() }}</p>
      </header>

      @if (loading()) {
        <div class="loading">Chargement des statistiques...</div>
      } @else {
        <div class="stats-grid">
          <div class="stat-card users">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <h3>{{ stats().totalUsers }}</h3>
              <p>Utilisateurs</p>
            </div>
            <a routerLink="users" class="stat-link">Gérer →</a>
          </div>

          <div class="stat-card pollutions">
            <div class="stat-icon">🏭</div>
            <div class="stat-info">
              <h3>{{ stats().totalPollutions }}</h3>
              <p>Déclarations</p>
            </div>
            <a routerLink="pollutions" class="stat-link">Gérer →</a>
          </div>

          <div class="stat-card severity-high">
            <div class="stat-icon">🚨</div>
            <div class="stat-info">
              <h3>{{ stats().pollutionsByLevel['Élevé'] || 0 }}</h3>
              <p>Niveau élevé</p>
            </div>
          </div>

          <div class="stat-card recent">
            <div class="stat-icon">📅</div>
            <div class="stat-info">
              <h3>{{ stats().recentPollutions }}</h3>
              <p>Cette semaine</p>
            </div>
          </div>
        </div>

        <div class="quick-actions">
          <h2>Actions rapides</h2>
          <div class="action-buttons">
            <a routerLink="users" class="action-btn">
              <span class="icon">👥</span>
              <span>Gestion utilisateurs</span>
            </a>
            <a routerLink="pollutions" class="action-btn">
              <span class="icon">🏭</span>
              <span>Gestion pollutions</span>
            </a>
            <a routerLink="/pollutions/create" class="action-btn">
              <span class="icon">➕</span>
              <span>Nouvelle déclaration</span>
            </a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .admin-dashboard {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }

      .dashboard-header {
        margin-bottom: 2rem;
        color: white;

        h1 {
          font-size: 2rem;
          margin: 0 0 0.5rem;
        }

        p {
          opacity: 0.9;
          margin: 0;
        }
      }

      .loading {
        text-align: center;
        padding: 3rem;
        color: white;
        font-size: 1.1rem;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .stat-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }

        &.users::before {
          background: #667eea;
        }
        &.pollutions::before {
          background: #48bb78;
        }
        &.severity-high::before {
          background: #f56565;
        }
        &.recent::before {
          background: #ed8936;
        }

        .stat-icon {
          font-size: 2rem;
        }

        .stat-info {
          h3 {
            font-size: 2rem;
            margin: 0;
            color: #2d3748;
          }

          p {
            margin: 0;
            color: #718096;
            font-size: 0.9rem;
          }
        }

        .stat-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .quick-actions {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

        h2 {
          margin: 0 0 1.5rem;
          font-size: 1.25rem;
          color: #2d3748;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: #f7fafc;
          border-radius: 8px;
          text-decoration: none;
          color: #2d3748;
          font-weight: 500;
          transition: all 0.2s;

          .icon {
            font-size: 1.5rem;
          }

          &:hover {
            background: #edf2f7;
            transform: translateY(-2px);
          }
        }
      }
    `,
  ],
})
export class AdminDashboardComponent {
  private readonly store = inject(Store)
  private readonly userService = inject(UserService)
  private readonly pollutionService = inject(PollutionService)

  // User name from store as signal
  private readonly user = toSignal(this.store.select(AuthState.user))
  readonly userName = computed(() => {
    const u = this.user()
    return u ? `${u.prenom} ${u.nom}` : 'Admin'
  })

  // rxResource with forkJoin for combined data loading
  readonly dashboardResource = rxResource({
    stream: () =>
      forkJoin({
        users: this.userService.getAll(),
        pollutions: this.pollutionService.getAll(),
      }).pipe(
        map(({ users, pollutions }) => {
          const oneWeekAgo = new Date()
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

          const pollutionsByLevel: Record<string, number> = {}
          let recentCount = 0

          pollutions.forEach(p => {
            pollutionsByLevel[p.niveau] = (pollutionsByLevel[p.niveau] || 0) + 1
            if (new Date(p.dateObservation) >= oneWeekAgo) {
              recentCount++
            }
          })

          return {
            totalUsers: users.length,
            totalPollutions: pollutions.length,
            pollutionsByLevel,
            recentPollutions: recentCount,
          } satisfies DashboardStats
        })
      ),
  })

  // Convenience computed signals
  readonly loading = computed(() => this.dashboardResource.isLoading())
  readonly stats = computed<DashboardStats>(
    () =>
      this.dashboardResource.value() ?? {
        totalUsers: 0,
        totalPollutions: 0,
        pollutionsByLevel: {},
        recentPollutions: 0,
      }
  )
}
