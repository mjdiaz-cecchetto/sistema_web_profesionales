<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Base desde cero: solo lo que la plataforma necesita para arrancar.
 * Cuentas (centros y profesionales), personas, pacientes, turnos y cobros
 * se dan de alta desde el sistema.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PlanesSeeder::class,
            CatalogoObrasSocialesSeeder::class,
            AdministradorSeeder::class,
        ]);
    }
}
