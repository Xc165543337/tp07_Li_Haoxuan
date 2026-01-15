import { CommonModule } from '@angular/common'
import { Component, computed, inject, input } from '@angular/core'
import { rxResource } from '@angular/core/rxjs-interop'
import { Router, RouterLink } from '@angular/router'
import { PollutionService } from '../services/pollution.service'
import { ToastService } from '../services/toast.service'

/**
 * PollutionDetailComponent using rxResource for declarative async loading.
 *
 * Benefits of rxResource:
 * - Automatic loading/error state management via .isLoading() and .error()
 * - Automatic reload when route param changes (reactive to input signal)
 * - No manual subscription management needed
 * - Built-in signal-based reactivity
 */
@Component({
  selector: 'app-pollution-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pollution-detail.component.html',
  styleUrls: ['./pollution-detail.component.less'],
})
export class PollutionDetailComponent {
  private readonly router = inject(Router)
  private readonly pollutionService = inject(PollutionService)
  private readonly toastService = inject(ToastService)

  // Route param as input signal (requires withComponentInputBinding())
  readonly id = input.required<string>()

  // Computed signal for numeric ID
  private readonly pollutionId = computed(() => Number(this.id()))

  // rxResource automatically:
  // - Tracks loading state via .isLoading()
  // - Tracks errors via .error()
  // - Reloads when pollutionId() changes
  // - Provides .value() for the data
  readonly pollutionResource = rxResource({
    params: () => this.pollutionId(),
    stream: ({ params: id }) => this.pollutionService.getById(id),
  })

  // Convenience computed signals for template
  readonly pollution = computed(() => this.pollutionResource.value())
  readonly loading = computed(() => this.pollutionResource.isLoading())
  readonly error = computed(() => this.pollutionResource.error())

  deletePollution(): void {
    const pollution = this.pollution()
    if (pollution && confirm('Êtes-vous sûr de vouloir supprimer cette déclaration ?')) {
      this.pollutionService.delete(pollution.id).subscribe({
        next: () => {
          this.toastService.show('Déclaration supprimée avec succès', 'success')
          this.router.navigate(['/pollutions/list'])
        },
        error: error => {
          this.toastService.show('Erreur lors de la suppression', 'error')
          console.error('Error deleting pollution:', error)
        },
      })
    }
  }
}
