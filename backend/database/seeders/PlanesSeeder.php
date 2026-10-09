<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Planes iniciales (los mismos que usa hoy el frontend).
 * Solo inserta los que faltan: si después se editan desde /gestion,
 * volver a correr el seeder no los pisa.
 */
class PlanesSeeder extends Seeder
{
    public function run(): void
    {
        $planes = [
            [
                'nombre' => 'Demo',
                'precio_mensual' => 0,
                'descripcion' => 'Para conocer el sistema. Sin cobro.',
                'max_profesionales' => 1,
            ],
            [
                'nombre' => 'Profesional',
                'precio_mensual' => 15000,
                'descripcion' => 'Profesional independiente: agenda, pacientes y página pública.',
                'max_profesionales' => 1,
            ],
            [
                'nombre' => 'Consultorio',
                'precio_mensual' => 40000,
                'descripcion' => 'Centros con equipo: hasta 10 profesionales, página del centro.',
                'max_profesionales' => 10,
            ],
        ];

        $ahora = now();
        foreach ($planes as $plan) {
            if (DB::table('planes')->where('nombre', $plan['nombre'])->exists()) {
                continue;
            }
            DB::table('planes')->insert($plan + [
                'activo' => true,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }
    }
}
