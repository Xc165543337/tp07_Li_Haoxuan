import { CommonModule } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { rxResource } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { POLLUTION_LEVELS, POLLUTION_TYPES, PollutionDeclaration } from '../models/pollution.model'
import { PollutionService } from '../services/pollution.service'
import { ToastService } from '../services/toast.service'

/**
 * AdminPollutionsComponent using rxResource for declarative async loading.
 *
 * Benefits:
 * - Reload trigger pattern for refreshing after mutations
 * - Computed filtered list based on type/level filters
 * - Cleaner code without manual loading state management
 */
@Component({
  selector: 'app-admin-pollutions',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="admin-pollutions">
      <header class="page-header">
        <div class="header-left">
          <a routerLink="/admin" class="back-link">← Retour</a>
          <h1>🏭 Gestion des pollutions</h1>
        </div>
        <div class="header-right">
          <select [(ngModel)]="filterType" (change)="applyFilters()" class="filter-select">
            <option value="">Tous les types</option>
            @for (type of types; track type) {
              <option [value]="type">{{ type }}</option>
            }
          </select>
          <select [(ngModel)]="filterLevel" (change)="applyFilters()" class="filter-select">
            <option value="">Tous les niveaux</option>
            @for (level of levels; track level) {
              <option [value]="level">{{ level }}</option>
            }
          </select>
        </div>
      </header>

      @if (loading()) {
        <div class="loading">Chargement...</div>
      } @else {
        <div class="pollutions-table-container">
          <table class="pollutions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Titre</th>
                <th>Type</th>
                <th>Niveau</th>
                <th>Date</th>
                <th>Déclarant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (pollution of filteredPollutions(); track pollution.id) {
                <tr>
                  <td>{{ pollution.id }}</td>
                  <td class="title-cell">
                    <a [routerLink]="['/pollutions/detail', pollution.id]">
                      {{ pollution.titre }}
                    </a>
                  </td>
                  <td>
                    <span class="type-badge">{{ pollution.type }}</span>
                  </td>
                  <td>
                    <span class="level-badge" [class]="'level-' + pollution.niveau.toLowerCase()">
                      {{ pollution.niveau }}
                    </span>
                  </td>
                  <td>{{ pollution.dateObservation | date: 'shortDate' }}</td>
                  <td>
                    @if (pollution.utilisateur) {
                      {{ pollution.utilisateur.prenom }} {{ pollution.utilisateur.nom }}
                    } @else {
                      <span class="unknown">Inconnu</span>
                    }
                  </td>
                  <td class="actions">
                    <a
                      [routerLink]="['/pollutions/edit', pollution.id]"
                      class="btn-icon"
                      title="Modifier"
                    >
                      ✏️
                    </a>
                    <button
                      class="btn-icon btn-danger"
                      title="Supprimer"
                      (click)="deletePollution(pollution)"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="no-data">Aucune pollution trouvée</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="summary">
          {{ filteredPollutions().length }} déclaration(s) sur {{ pollutions().length }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .admin-pollutions {
        max-width: 1400px;
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

        .header-right {
          display: flex;
          gap: 0.75rem;
        }

        .filter-select {
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          min-width: 150px;
        }
      }

      .loading {
        text-align: center;
        padding: 3rem;
        color: white;
      }

      .pollutions-table-container {
        background: white;
        border-radius: 12px;
        overflow-x: auto;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      }

      .pollutions-table {
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
          white-space: nowrap;
        }

        .title-cell a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;

          &:hover {
            text-decoration: underline;
          }
        }

        .type-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #edf2f7;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .level-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;

          &.level-faible {
            background: #c6f6d5;
            color: #276749;
          }

          &.level-moyen {
            background: #feebc8;
            color: #c05621;
          }

          &.level-élevé {
            background: #fed7d7;
            color: #c53030;
          }
        }

        .unknown {
          color: #a0aec0;
          font-style: italic;
        }

        .actions {
          display: flex;
          gap: 0.5rem;

          .btn-icon {
            background: none;
            border: none;
            font-size: 1.1rem;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            text-decoration: none;
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
export class AdminPollutionsComponent {
  private readonly pollutionService = inject(PollutionService)
  private readonly toast = inject(ToastService)

  readonly types = [...POLLUTION_TYPES]
  readonly levels = [...POLLUTION_LEVELS]

  // Filter state signals
  private readonly typeFilter = signal('')
  private readonly levelFilter = signal('')
  filterType = ''
  filterLevel = ''

  // Reload trigger for refreshing after mutations
  private readonly reloadTrigger = signal(0)

  // rxResource for pollutions
  readonly pollutionsResource = rxResource({
    params: () => this.reloadTrigger(),
    stream: () => this.pollutionService.getAll(),
  })

  // Convenience computed signals
  readonly pollutions = computed(() => this.pollutionsResource.value() ?? [])
  readonly loading = computed(() => this.pollutionsResource.isLoading())

  // Filtered pollutions based on type and level filters
  readonly filteredPollutions = computed(() => {
    let result = this.pollutions()
    const type = this.typeFilter()
    const level = this.levelFilter()

    if (type) {
      result = result.filter(p => p.type === type)
    }
    if (level) {
      result = result.filter(p => p.niveau === level)
    }
    return result
  })

  applyFilters(): void {
    this.typeFilter.set(this.filterType)
    this.levelFilter.set(this.filterLevel)
  }

  private reload(): void {
    this.reloadTrigger.update(n => n + 1)
  }

  deletePollution(pollution: PollutionDeclaration): void {
    if (!confirm(`Supprimer "${pollution.titre}" ?\nCette action est irréversible.`)) {
      return
    }

    this.pollutionService.delete(pollution.id).subscribe({
      next: () => {
        this.toast.success('Pollution supprimée')
        this.reload()
      },
      error: () => {
        this.toast.error('Erreur lors de la suppression')
      },
    })
  }
}
