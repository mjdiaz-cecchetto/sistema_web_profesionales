<?php

namespace Tests\Feature;

use App\Models\Administrador;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Login del panel: administrador de la plataforma y personas de las cuentas.
 * Corre contra la base sistema_profesionales_test (ver phpunit.xml / make test).
 */
class SesionTest extends TestCase
{
    use RefreshDatabase;

    private function admin(array $datos = []): Administrador
    {
        return Administrador::create($datos + [
            'nombre' => 'Admin Plataforma',
            'email' => 'admin@test.local',
            'dni' => '30111222',
            'password' => 'secreto123',
            'rol' => 'administrador',
            'activo' => true,
        ]);
    }

    private function cuenta(string $nombre, string $estado = 'activa'): int
    {
        $plan = DB::table('planes')->insertGetId([
            'nombre' => 'Plan '.$nombre, 'precio_mensual' => 0, 'max_profesionales' => 0, 'activo' => true,
        ]);

        return DB::table('cuentas')->insertGetId([
            'tipo' => 'consultorio', 'nombre' => $nombre, 'slug' => str($nombre)->slug(),
            'email_contacto' => 'c@test.local', 'estado' => $estado, 'plan_id' => $plan, 'fecha_alta' => now()->toDateString(),
        ]);
    }

    private function persona(array $datos = []): Usuario
    {
        return Usuario::create($datos + [
            'nombre' => 'Persona Test',
            'dni' => '28456123',
            'email' => 'persona@test.local',
            'password' => 'clave1234',
            'activo' => true,
        ]);
    }

    private function membresia(int $cuentaId, int $usuarioId, string $rol = 'secretaria'): int
    {
        return DB::table('miembros')->insertGetId([
            'cuenta_id' => $cuentaId, 'usuario_id' => $usuarioId, 'rol' => $rol, 'activo' => true,
        ]);
    }

    public function test_sin_sesion_devuelve_null(): void
    {
        $this->getJson('/api/auth/sesion')->assertOk()->assertJson(['sesion' => null]);
    }

    public function test_admin_entra_con_email_y_con_dni(): void
    {
        $this->admin();

        $this->postJson('/api/auth/login', ['identificador' => ' ADMIN@test.local ', 'password' => 'secreto123'])
            ->assertOk()
            ->assertJsonPath('sesion.tipo', 'admin')
            ->assertJsonPath('sesion.admin.email', 'admin@test.local')
            ->assertJsonMissingPath('sesion.admin.password');
        $this->assertAuthenticated('plataforma');

        $this->postJson('/api/auth/logout')->assertOk()->assertJson(['sesion' => null]);
        $this->assertGuest('plataforma');

        $this->postJson('/api/auth/login', ['identificador' => '30.111.222', 'password' => 'secreto123'])
            ->assertOk()->assertJsonPath('sesion.tipo', 'admin');
    }

    public function test_contrasena_incorrecta(): void
    {
        $this->admin();

        $this->postJson('/api/auth/login', ['identificador' => 'admin@test.local', 'password' => 'otra'])
            ->assertStatus(422)->assertJson(['message' => 'Email o contraseña incorrectos.']);
        $this->assertGuest('plataforma');
    }

    public function test_admin_desactivado_no_entra(): void
    {
        $this->admin(['activo' => false]);

        $this->postJson('/api/auth/login', ['identificador' => 'admin@test.local', 'password' => 'secreto123'])
            ->assertStatus(403);
    }

    public function test_bloqueo_tras_cinco_intentos(): void
    {
        $this->admin();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['identificador' => 'admin@test.local', 'password' => 'mal'])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', ['identificador' => 'admin@test.local', 'password' => 'secreto123'])
            ->assertStatus(429);
    }

    public function test_persona_con_un_centro_entra_directo(): void
    {
        $cuenta = $this->cuenta('Centro Uno');
        $persona = $this->persona();
        $miembro = $this->membresia($cuenta, $persona->id, 'administrador');

        $this->postJson('/api/auth/login', ['identificador' => '28456123', 'password' => 'clave1234'])
            ->assertOk()
            ->assertJsonPath('sesion.tipo', 'usuario')
            ->assertJsonPath('sesion.miembroId', (string) $miembro)
            ->assertJsonPath('sesion.membresias.0.cuenta.nombre', 'Centro Uno')
            ->assertJsonMissingPath('sesion.usuario.password');
        $this->assertAuthenticated('web');
    }

    public function test_persona_con_varios_centros_elige(): void
    {
        $persona = $this->persona();
        $a = $this->membresia($this->cuenta('Centro A'), $persona->id);
        $this->membresia($this->cuenta('Centro B'), $persona->id);
        $this->membresia($this->cuenta('Centro Suspendido', 'suspendida'), $persona->id);

        $this->postJson('/api/auth/login', ['identificador' => 'persona@test.local', 'password' => 'clave1234'])
            ->assertOk()
            ->assertJsonCount(2, 'sesion.membresias')
            ->assertJsonPath('sesion.miembroId', null);

        $this->postJson('/api/auth/centro', ['miembroId' => (string) $a])
            ->assertOk()->assertJsonPath('sesion.miembroId', (string) $a);
        $this->getJson('/api/auth/sesion')->assertJsonPath('sesion.miembroId', (string) $a);
    }

    public function test_no_puede_elegir_un_centro_ajeno(): void
    {
        $persona = $this->persona();
        $this->membresia($this->cuenta('Centro A'), $persona->id);
        $otra = $this->persona(['dni' => '11222333', 'email' => 'otra@test.local']);
        $ajeno = $this->membresia($this->cuenta('Centro Ajeno'), $otra->id);

        $this->postJson('/api/auth/login', ['identificador' => '28456123', 'password' => 'clave1234'])->assertOk();
        $this->postJson('/api/auth/centro', ['miembroId' => (string) $ajeno])->assertStatus(403);
    }

    public function test_persona_sin_centro_activo_no_entra(): void
    {
        $this->persona();

        $this->postJson('/api/auth/login', ['identificador' => '28456123', 'password' => 'clave1234'])
            ->assertStatus(403);
        $this->assertGuest('web');
    }
}
