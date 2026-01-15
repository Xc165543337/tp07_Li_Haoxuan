import { CommonModule } from '@angular/common'
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input } from '@angular/core'
import { rxResource } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { UpdatePollutionPayload } from '../models/pollution.model'
import { PollutionFormComponent } from '../pollution-form/pollution-form.component'
import { PollutionService } from '../services/pollution.service'
import { ToastService } from '../services/toast.service'

/**
 * PollutionEditComponent using rxResource for declarative async loading.
 *
 * Benefits:
 * - Automatic loading state via .isLoading()
 * - Automatic error handling via .error()
 * - Reactive to route param changes
 * - Cleaner component code without manual subscription
 */
@Component({
  selector: 'app-pollution-edit',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, PollutionFormComponent],
  templateUrl: './pollution-edit.component.html',
  styleUrls: ['./pollution-edit.component.less'],
})
export class PollutionEditComponent {
  private readonly router = inject(Router)
  private readonly pollutionService = inject(PollutionService)
  private readonly toastService = inject(ToastService)

  // Route param as input signal
  readonly id = input.required<string>()

  // Computed numeric ID
  private readonly pollutionId = computed(() => Number(this.id()))

  // rxResource for declarative loading
  readonly pollutionResource = rxResource({
    params: () => this.pollutionId(),
    stream: ({ params: id }) => this.pollutionService.getById(id),
  })

  // Convenience computed signals
  readonly pollution = computed(() => this.pollutionResource.value())
  readonly loading = computed(() => this.pollutionResource.isLoading())

  onSave(payload: UpdatePollutionPayload): void {
    const pollution = this.pollution()
    if (!pollution) return

    this.pollutionService.update(pollution.id, payload).subscribe({
      next: () => {
        this.toastService.show('Pollution mise à jour avec succès', 'success')
        this.router.navigate(['/pollutions/detail', pollution.id])
      },
      error: error => {
        this.toastService.show('Erreur lors de la mise à jour', 'error')
        console.error('Error updating pollution:', error)
      },
    })
  }

  onCancel(): void {
    this.router.navigate(['/pollutions/list'])
  }
}
