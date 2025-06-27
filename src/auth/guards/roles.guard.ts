import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    // Si l'utilisateur n'a pas de rôles, refuser l'accès
    if (!user.roles || user.roles.length === 0) {
      return false;
    }

    try {
      // Récupérer tous les rôles du serveur Discord
      const guildRoles = await this.authService.getGuildRoles(user.guildId);
      
      // Mapper les IDs des rôles de l'utilisateur vers leurs noms
      const userRoleNames = guildRoles
        .filter(role => user.roles.includes(role.id))
        .map(role => role.name);
      
      // Correspondance entre les noms de rôles Discord et les rôles attendus
      const roleMapping = {
        'Administrateur': 'admin',
        'Chargé de projet': 'project-manager',
        'Directeur': 'director'
      };
      
      // Convertir les noms de rôles Discord en rôles système
      const userSystemRoles = userRoleNames
        .map(roleName => roleMapping[roleName])
        .filter(role => role); // Filtrer les rôles non mappés
      
      // Vérifier si l'utilisateur a au moins un des rôles requis
      return requiredRoles.some(requiredRole => userSystemRoles.includes(requiredRole));
    } catch (error) {
      // En cas d'erreur lors de la récupération des rôles, refuser l'accès
      console.error('Erreur lors de la vérification des rôles:', error);
      return false;
    }
  }
} 