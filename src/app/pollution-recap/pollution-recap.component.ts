import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { rxResource } from '@angular/core/rxjs-interop'
import { RouterLink } from '@angular/router'
import { POLLUTION_LEVELS, POLLUTION_TYPES, PollutionStats } from '../models/pollution.model'
import { PollutionService } from '../services/pollution.service'

/**
 * PollutionRecapComponent using rxResource for declarative async loading.
 *
 * Benefits:
 * - Automatic loading state management
 * - Computed signals for derived statistics
 * - No manual subscription or ngOnInit needed
 */
@Component({
  selector: 'app-pollution-recap',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pollution-recap.component.html',
  styleUrls: ['./pollution-recap.component.less'],
})
export class PollutionRecapComponent {
  private readonly pollutionService = inject(PollutionService)

  readonly pollutionLevel = [...POLLUTION_LEVELS]
  readonly pollutionType = [...POLLUTION_TYPES]

  // rxResource loads automatically on component init
  readonly pollutionsResource = rxResource({
    stream: () => this.pollutionService.getAll(),
  })

  // Convenience computed signals
  readonly pollutions = computed(() => this.pollutionsResource.value() ?? [])
  readonly loading = computed(() => this.pollutionsResource.isLoading())
  readonly error = computed(() => this.pollutionsResource.error())

  // Computed statistics - recalculates when pollutions change
  readonly stats = computed<PollutionStats>(() => {
    const pollutions = this.pollutions()
    return {
      totalDeclarations: pollutions.length,
      declarationsBySeverity: {
        Faible: pollutions.filter(p => p.niveau === 'Faible').length,
        Moyen: pollutions.filter(p => p.niveau === 'Moyen').length,
        Élevé: pollutions.filter(p => p.niveau === 'Élevé').length,
      },
      declarationsByType: {
        Plastique: pollutions.filter(p => p.type === 'Plastique').length,
        Chimique: pollutions.filter(p => p.type === 'Chimique').length,
        'Dépôt sauvage': pollutions.filter(p => p.type === 'Dépôt sauvage').length,
        Eau: pollutions.filter(p => p.type === 'Eau').length,
        Air: pollutions.filter(p => p.type === 'Air').length,
        Autre: pollutions.filter(p => p.type === 'Autre').length,
      },
    }
  })
}
