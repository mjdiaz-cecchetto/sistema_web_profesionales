<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Persona con acceso al panel de una o más cuentas (centros o consultorios).
 * Entra con DNI o email; el rol en cada cuenta vive en `miembros`.
 */
class Usuario extends Authenticatable
{
    use Notifiable;

    protected $table = 'usuarios';

    protected $fillable = ['nombre', 'dni', 'email', 'password', 'activo'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'activo' => 'boolean',
        ];
    }
}
