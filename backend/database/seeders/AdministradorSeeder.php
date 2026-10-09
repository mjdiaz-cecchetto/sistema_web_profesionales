<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Único usuario inicial: el administrador de la plataforma (/gestion).
 * Nombre, email, DNI y contraseña salen de .env (PLATAFORMA_ADMIN_*). Si la contraseña
 * está vacía se genera una aleatoria y se muestra UNA sola vez.
 * Si el administrador ya existe no se toca (no se resetea su contraseña).
 */
class AdministradorSeeder extends Seeder
{
    public function run(): void
    {
        $config = config('plataforma.admin');
        $email = strtolower(trim((string) ($config['email'] ?? '')));

        if ($email === '') {
            throw new RuntimeException('Falta PLATAFORMA_ADMIN_EMAIL en backend/.env');
        }

        $dni = preg_replace('/\D/', '', (string) ($config['dni'] ?? '')) ?: null;

        $existe = DB::table('administradores')
            ->where('email', $email)
            ->when($dni, fn ($q) => $q->orWhere('dni', $dni))
            ->exists();
        if ($existe) {
            $this->command?->info("Administrador {$email}: ya existía, no se modificó.");

            return;
        }

        $password = (string) ($config['password'] ?? '');
        $generada = $password === '';
        if ($generada) {
            $password = Str::password(16, symbols: false);
        }

        $ahora = now();
        DB::table('administradores')->insert([
            'nombre' => $config['nombre'] ?: 'Administrador',
            'email' => $email,
            'dni' => $dni,
            'password' => Hash::make($password),
            'rol' => 'administrador',
            'activo' => true,
            'created_at' => $ahora,
            'updated_at' => $ahora,
        ]);

        $this->command?->info("Administrador de la plataforma creado: {$email}");
        if ($generada) {
            $this->command?->warn("Contraseña generada (guardala, no se vuelve a mostrar): {$password}");
        }
    }
}
