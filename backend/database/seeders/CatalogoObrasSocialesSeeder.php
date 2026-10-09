<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Catálogo de la plataforma: solo sugiere nombres cuando un centro arma su
 * lista de obras sociales. "Particular" no va acá (es profesionales.acepta_particular).
 */
class CatalogoObrasSocialesSeeder extends Seeder
{
    public function run(): void
    {
        $nombres = [
            'OSDE', 'Swiss Medical', 'Galeno', 'Sancor Salud', 'Medifé', 'IOMA',
            'PAMI', 'OSECAC', 'Unión Personal', 'OSPRERA', 'OSPE', 'Avalian',
        ];

        DB::table('catalogo_obras_sociales')->insertOrIgnore(
            array_map(fn (string $nombre) => ['nombre' => $nombre, 'activo' => true], $nombres)
        );
    }
}
