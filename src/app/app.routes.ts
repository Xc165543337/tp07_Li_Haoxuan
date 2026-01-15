import { Routes } from '@angular/router'
import { LoginComponent } from './auth/login.component'
import { RegisterComponent } from './auth/register.component'
import { FavoritesComponent } from './favorites/favorites.component'
import { authGuard, homeGuard } from './guards/auth.guard'
import { HomeComponent } from './home/home.component'
import { ProfileComponent } from './profile/profile.component'

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [homeGuard],
  },
  {
    path: 'pollutions',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./pollution/pollution-routing.module').then(m => m.POLLUTION_ROUTES),
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: 'favorites',
    component: FavoritesComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
]
