import { CommonModule } from '@angular/common'
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core'
import { Router } from '@angular/router'
import { CreatePollutionPayload } from '../models/pollution.model'
import { PollutionFormComponent } from '../pollution-form/pollution-form.component'
import { PollutionService } from '../services/pollution.service'
import { ToastService } from '../services/toast.service'

@Component({
  selector: 'app-pollution-create',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, PollutionFormComponent],
  templateUrl: './pollution-create.component.html',
  styleUrls: ['./pollution-create.component.less'],
})
export class PollutionCreateComponent {
  private readonly pollutionService = inject(PollutionService)
  private readonly toastService = inject(ToastService)
  private readonly router = inject(Router)

  // No longer needed as the form component handles initialization internally
  // The form is initialized with empty values

  onSave(payload: CreatePollutionPayload): void {
    this.pollutionService.create(payload).subscribe({
      next: created => {
        this.toastService.show('Pollution créée avec succès', 'success')
        this.router.navigate(['/pollutions/detail', created.id])
      },
      error: error => {
        this.toastService.show('Erreur lors de la création', 'error')
        console.error('Error creating pollution:', error)
      },
    })
  }

  onCancel(): void {
    this.router.navigate(['/pollutions/list'])
  }
}
