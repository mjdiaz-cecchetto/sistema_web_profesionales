<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Persona del equipo de la plataforma (back-office /gestion).
 * Se autentica con el guard `plataforma`, separado de las personas de las cuentas.
 */
class Administrador extends Authenticatable
{
    use Notifiable;

    protected $table = 'administradores';

    protected $fillable = ['nombre', 'email', 'dni', 'password', 'rol', 'activo'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'activo' => 'boolean',
        ];
    }
}
