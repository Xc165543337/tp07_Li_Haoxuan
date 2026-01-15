import { CommonModule } from '@angular/common'
import { Component, DestroyRef, OnInit, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { Store } from '@ngxs/store'
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from 'rxjs'
import { POLLUTION_LEVELS, POLLUTION_TYPES, PollutionDeclaration } from '../models/pollution.model'
import { PollutionService } from '../services/pollution.service'
import { ToastService } from '../services/toast.service'
import { AddBookmark, RemoveBookmark } from '../store/bookmark.actions'
import { BookmarkState } from '../store/bookmark.state'

/**
 * Interface pour les critères de filtrage
 */
interface FilterCriteria {
  searchText: string
  type: string
  level: string
  dateFrom: string
  dateTo: string
}

@Component({
  selector: 'app-pollution-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './pollution-list.component.html',
  styleUrls: ['./pollution-list.component.less'],
})
export class PollutionListComponent implements OnInit {
  private readonly pollutionService = inject(PollutionService)
  private readonly toastService = inject(ToastService)
  private readonly store = inject(Store)
  private readonly destroyRef = inject(DestroyRef)

  // Observable pour les pollutions filtrées (utilisé avec async pipe)
  filteredPollutions$!: Observable<PollutionDeclaration[]>

  // Subjects pour la recherche réactive
  private readonly searchText$ = new BehaviorSubject<string>('')
  private readonly selectedType$ = new BehaviorSubject<string>('')
  private readonly selectedLevel$ = new BehaviorSubject<string>('')
  private readonly dateFrom$ = new BehaviorSubject<string>('')
  private readonly dateTo$ = new BehaviorSubject<string>('')
  private readonly refresh$ = new BehaviorSubject<void>(undefined)

  // Propriétés pour le template (binding bidirectionnel)
  searchText = ''
  selectedType = ''
  selectedLevel = ''
  dateFrom = ''
  dateTo = ''

  pollutionTypes = [...POLLUTION_TYPES]
  pollutionLevels = [...POLLUTION_LEVELS]

  // Indicateur de chargement
  isLoading = false

  ngOnInit(): void {
    this.setupDynamicSearch()
  }

  /**
   * Configuration de la recherche dynamique avec opérateurs RxJS avancés
   *
   * Opérateurs utilisés:
   * - BehaviorSubject: émet la dernière valeur aux nouveaux abonnés
   * - debounceTime: attend 300ms après la dernière frappe
   * - distinctUntilChanged: ignore les valeurs identiques consécutives
   * - combineLatest: combine les dernières valeurs de tous les filtres
   * - switchMap: annule les requêtes précédentes (évite les race conditions)
   * - map: transforme les données (applique les filtres côté client)
   */
  private setupDynamicSearch(): void {
    // Combine tous les filtres avec debounce sur la recherche texte
    const filters$: Observable<FilterCriteria> = combineLatest([
      this.searchText$.pipe(
        debounceTime(300), // Attend 300ms après la dernière frappe
        distinctUntilChanged() // Ignore si la valeur n'a pas changé
      ),
      this.selectedType$.pipe(distinctUntilChanged()),
      this.selectedLevel$.pipe(distinctUntilChanged()),
      this.dateFrom$.pipe(distinctUntilChanged()),
      this.dateTo$.pipe(distinctUntilChanged()),
    ]).pipe(
      map(([searchText, type, level, dateFrom, dateTo]) => ({
        searchText,
        type,
        level,
        dateFrom,
        dateTo,
      }))
    )

    // Flux principal: recharge les données puis applique les filtres
    this.filteredPollutions$ = combineLatest([this.refresh$, filters$]).pipe(
      switchMap(([, filters]) => {
        this.isLoading = true
        // switchMap annule les requêtes précédentes si une nouvelle arrive
        return this.pollutionService.getAll().pipe(
          map(pollutions => this.applyClientFilters(pollutions, filters)),
          startWith([]) // Valeur initiale pendant le chargement
        )
      }),
      map(pollutions => {
        this.isLoading = false
        return pollutions
      }),
      takeUntilDestroyed(this.destroyRef) // Nettoyage automatique
    )
  }

  /**
   * Applique les filtres côté client
   */
  private applyClientFilters(
    pollutions: PollutionDeclaration[],
    filters: FilterCriteria
  ): PollutionDeclaration[] {
    return pollutions.filter(pollution => {
      // Recherche texte (titre, adresse, ou description)
      const matchesSearch =
        !filters.searchText ||
        pollution.titre.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        (pollution.adresse?.toLowerCase().includes(filters.searchText.toLowerCase()) ?? false) ||
        pollution.description.toLowerCase().includes(filters.searchText.toLowerCase())

      // Filtre par type
      const matchesType = !filters.type || pollution.type === filters.type

      // Filtre par niveau
      const matchesLevel = !filters.level || pollution.niveau === filters.level

      // Filtre par date
      const pollutionDate = new Date(pollution.dateObservation)
      const matchesDateFrom = !filters.dateFrom || pollutionDate >= new Date(filters.dateFrom)
      const matchesDateTo = !filters.dateTo || pollutionDate <= new Date(filters.dateTo)

      return matchesSearch && matchesType && matchesLevel && matchesDateFrom && matchesDateTo
    })
  }

  /**
   * Formate l'affichage de la localisation (adresse ou GPS)
   */
  getLocationDisplay(pollution: PollutionDeclaration): string {
    if (pollution.adresse) {
      return pollution.adresse
    }
    if (pollution.latitude != null && pollution.longitude != null) {
      return `📍 ${pollution.latitude.toFixed(4)}, ${pollution.longitude.toFixed(4)}`
    }
    return 'Non spécifié'
  }

  /**
   * Formate le nom de l'utilisateur créateur
   */
  getUserDisplay(pollution: PollutionDeclaration): string {
    if (pollution.utilisateur) {
      const { prenom, nom, nomUtilisateur } = pollution.utilisateur
      if (prenom && nom) {
        return `${prenom} ${nom}`
      }
      return nomUtilisateur || 'Utilisateur inconnu'
    }
    return 'Anonyme'
  }

  // Méthodes appelées par le template pour émettre les nouvelles valeurs
  onSearchTextChange(value: string): void {
    this.searchText$.next(value)
  }

  onTypeChange(value: string): void {
    this.selectedType$.next(value)
  }

  onLevelChange(value: string): void {
    this.selectedLevel$.next(value)
  }

  onDateFromChange(value: string): void {
    this.dateFrom$.next(value)
  }

  onDateToChange(value: string): void {
    this.dateTo$.next(value)
  }

  /**
   * Force le rechargement des données
   */
  refreshData(): void {
    this.refresh$.next()
  }

  isBookmarked(pollutionId: number): boolean {
    return this.store.selectSnapshot(BookmarkState.isBookmarked)(pollutionId)
  }

  toggleBookmark(pollution: PollutionDeclaration, event: Event): void {
    event.stopPropagation()
    event.preventDefault()

    if (this.isBookmarked(pollution.id)) {
      this.store.dispatch(new RemoveBookmark(pollution.id))
      this.toastService.show('Retiré des favoris', 'info')
    } else {
      this.store.dispatch(new AddBookmark(pollution))
      this.toastService.show('Ajouté aux favoris', 'success')
    }
  }

  deletePollution(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette pollution ?')) {
      this.pollutionService.delete(id).subscribe({
        next: () => {
          this.toastService.show('Pollution supprimée avec succès', 'success')
          this.refreshData() // Utilise le Subject pour rafraîchir
        },
        error: error => {
          this.toastService.show('Erreur lors de la suppression', 'error')
          console.error('Error deleting pollution:', error)
        },
      })
    }
  }
}
