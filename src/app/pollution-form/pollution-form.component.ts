import { CommonModule } from '@angular/common'
import {
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import {
  LocationType,
  PhotoSourceType,
  POLLUTION_LEVELS,
  POLLUTION_TYPES,
  PollutionDeclaration,
  PollutionDeclarationBase,
} from '../models/pollution.model'
import { PollutionService } from '../services/pollution.service'
import { ToastService } from '../services/toast.service'

/**
 * Pollution Form Component with modern practices:
 * - Reactive Forms with typed FormGroup
 * - Signals for reactive state management
 * - Computed properties for derived state
 * - takeUntilDestroyed for automatic subscription cleanup
 * - Custom validators for location validation
 * - File upload with preview
 */
@Component({
  selector: 'app-pollution-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pollution-form.component.html',
  styleUrls: ['./pollution-form.component.less'],
})
export class PollutionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder)
  private readonly pollutionService = inject(PollutionService)
  private readonly toastService = inject(ToastService)
  private readonly destroyRef = inject(DestroyRef)

  @Input() pollution: PollutionDeclaration | null = null
  @Output() saveEvent = new EventEmitter<PollutionDeclarationBase>()
  @Output() cancelEvent = new EventEmitter<void>()

  // Constants for template
  readonly niveaux = [...POLLUTION_LEVELS]
  readonly types = [...POLLUTION_TYPES]

  // Reactive signals for UI state
  readonly locationType = signal<LocationType>('address')
  readonly photoSource = signal<PhotoSourceType>('url')
  readonly isUploading = signal(false)
  readonly uploadedPhotoUrl = signal<string | null>(null)
  readonly photoPreviewError = signal(false)

  // Computed properties
  readonly isEditMode = computed(() => !!this.pollution?.id)
  readonly showGpsFields = computed(
    () => this.locationType() === 'gps' || this.locationType() === 'both'
  )
  readonly showAddressField = computed(
    () => this.locationType() === 'address' || this.locationType() === 'both'
  )
  readonly showPhotoUrlInput = computed(() => this.photoSource() === 'url')
  readonly showPhotoUpload = computed(() => this.photoSource() === 'upload')

  // Form group with proper typing
  form!: FormGroup

  ngOnInit(): void {
    this.initializeForm()
    this.setupFormValueChanges()

    // Determine initial location type from existing data
    if (this.pollution) {
      this.detectLocationType()
      this.detectPhotoSource()
    }
  }

  private initializeForm(): void {
    this.form = this.fb.group(
      {
        titre: [this.pollution?.titre ?? '', [Validators.required, Validators.minLength(3)]],
        type: [this.pollution?.type ?? '', Validators.required],
        description: [
          this.pollution?.description ?? '',
          [Validators.required, Validators.minLength(10)],
        ],
        dateObservation: [
          this.pollution?.dateObservation ?? this.getTodayDate(),
          Validators.required,
        ],
        niveau: [this.pollution?.niveau ?? '', Validators.required],

        // Location fields (validated together)
        adresse: [this.pollution?.adresse ?? ''],
        latitude: [this.pollution?.latitude ?? null],
        longitude: [this.pollution?.longitude ?? null],

        // Photo
        photoUrl: [this.pollution?.photoUrl ?? ''],
      },
      {
        validators: [this.locationValidator],
      }
    )
  }

  /**
   * Custom validator: At least one location type must be provided
   */
  private locationValidator = (control: AbstractControl): Record<string, boolean> | null => {
    const adresse = control.get('adresse')?.value
    const latitude = control.get('latitude')?.value
    const longitude = control.get('longitude')?.value

    const hasAddress = adresse && adresse.trim().length > 0
    const hasGps = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)

    if (!hasAddress && !hasGps) {
      return { locationRequired: true }
    }
    return null
  }

  private setupFormValueChanges(): void {
    // Reset photo preview error when URL changes
    this.form
      .get('photoUrl')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.photoPreviewError.set(false)
      })
  }

  private detectLocationType(): void {
    const hasAddress = this.pollution?.adresse?.trim()
    const hasGps = this.pollution?.latitude != null && this.pollution?.longitude != null

    if (hasAddress && hasGps) {
      this.locationType.set('both')
    } else if (hasGps) {
      this.locationType.set('gps')
    } else {
      this.locationType.set('address')
    }
  }

  private detectPhotoSource(): void {
    const photoUrl = this.pollution?.photoUrl
    if (photoUrl?.startsWith('/uploads/')) {
      this.photoSource.set('upload')
      this.uploadedPhotoUrl.set(photoUrl)
    } else {
      this.photoSource.set('url')
    }
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  // ─────────────────────────────────────────
  // Location Type Toggle
  // ─────────────────────────────────────────
  setLocationType(type: LocationType): void {
    this.locationType.set(type)

    // Clear irrelevant fields
    if (type === 'gps') {
      this.form.patchValue({ adresse: '' })
    } else if (type === 'address') {
      this.form.patchValue({ latitude: null, longitude: null })
    }

    // Revalidate form
    this.form.updateValueAndValidity()
  }

  // ─────────────────────────────────────────
  // Photo Source Toggle
  // ─────────────────────────────────────────
  setPhotoSource(source: PhotoSourceType): void {
    this.photoSource.set(source)

    // Clear photo when switching
    if (source === 'url') {
      this.uploadedPhotoUrl.set(null)
    } else {
      this.form.patchValue({ photoUrl: '' })
    }
  }

  // ─────────────────────────────────────────
  // File Upload
  // ─────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]

    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Veuillez sélectionner une image valide')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      this.toastService.error("L'image ne doit pas dépasser 5 Mo")
      return
    }

    this.uploadPhoto(file)
  }

  private uploadPhoto(file: File): void {
    this.isUploading.set(true)

    this.pollutionService
      .uploadPhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.uploadedPhotoUrl.set(response.photoUrl)
          this.form.patchValue({ photoUrl: response.photoUrl })
          this.toastService.success('Photo téléchargée avec succès')
          this.isUploading.set(false)
        },
        error: () => {
          this.toastService.error("Erreur lors du téléchargement de l'image")
          this.isUploading.set(false)
        },
      })
  }

  removeUploadedPhoto(): void {
    this.uploadedPhotoUrl.set(null)
    this.form.patchValue({ photoUrl: '' })
  }

  // ─────────────────────────────────────────
  // Photo Preview
  // ─────────────────────────────────────────
  isValidImageUrl(url: string | undefined | null): boolean {
    if (!url) return false
    return (
      url.trim().length > 0 &&
      (url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:image/') ||
        url.startsWith('/uploads/'))
    )
  }

  onImageError(): void {
    this.photoPreviewError.set(true)
  }

  onImageLoad(): void {
    this.photoPreviewError.set(false)
  }

  // ─────────────────────────────────────────
  // Geolocation API
  // ─────────────────────────────────────────
  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.toastService.error("La géolocalisation n'est pas supportée par votre navigateur")
      return
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        this.form.patchValue({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        this.toastService.success('Position GPS récupérée')
      },
      error => {
        const messages: Record<number, string> = {
          1: 'Accès à la position refusé',
          2: 'Position non disponible',
          3: 'Délai de récupération dépassé',
        }
        this.toastService.error(messages[error.code] || 'Erreur de géolocalisation')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ─────────────────────────────────────────
  // Form Actions
  // ─────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }

    const formValue = this.form.value

    // Build payload, cleaning null/empty values appropriately
    const payload: PollutionDeclarationBase = {
      titre: formValue.titre,
      type: formValue.type,
      description: formValue.description,
      dateObservation: formValue.dateObservation,
      niveau: formValue.niveau,
      adresse: formValue.adresse?.trim() || null,
      latitude: formValue.latitude ?? null,
      longitude: formValue.longitude ?? null,
      photoUrl: formValue.photoUrl?.trim() || null,
    }

    this.saveEvent.emit(payload)
  }

  onCancel(): void {
    this.cancelEvent.emit()
  }

  // ─────────────────────────────────────────
  // Template Helpers
  // ─────────────────────────────────────────
  hasError(fieldName: string): boolean {
    const field = this.form.get(fieldName)
    return !!(field?.invalid && field?.touched)
  }

  hasFormError(errorName: string): boolean {
    return !!(this.form.errors?.[errorName] && this.form.touched)
  }
}
