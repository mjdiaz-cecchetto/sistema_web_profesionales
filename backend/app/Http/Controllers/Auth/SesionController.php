<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Administrador;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Login del panel con sesión por cookie (mismo dominio que el frontend).
 *
 * Una sola pantalla de login para dos tipos de sesión:
 *  - Administrador de la plataforma (guard `plataforma`) → back-office /gestion.
 *  - Persona de una cuenta (guard `web`, tabla usuarios) → panel /admin, trabajando
 *    en UNA cuenta a la vez (membresía elegida, guardada en la sesión).
 * El identificador puede ser email o DNI en ambos casos.
 *
 * Respuesta común: { sesion: null | { tipo: 'admin', admin } | { tipo: 'usuario', usuario, membresias, miembroId } }
 */
class SesionController extends Controller
{
    private const MAX_INTENTOS = 5;

    private const BLOQUEO_SEGUNDOS = 60;

    /** Sesión actual (el frontend la consulta al iniciar). También deja la cookie XSRF-TOKEN. */
    public function mostrar(Request $request): JsonResponse
    {
        return response()->json(['sesion' => $this->sesionActual($request)]);
    }

    public function login(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'identificador' => ['required', 'string', 'max:190'],
            'password' => ['required', 'string', 'max:255'],
        ], [
            'identificador.required' => 'Ingresá tu email o DNI.',
            'password.required' => 'Ingresá tu contraseña.',
        ]);

        $texto = Str::lower(trim($datos['identificador']));
        $dni = preg_replace('/[.\s-]/', '', $texto);
        $esDni = preg_match('/^\d{7,9}$/', $dni) === 1;
        $campo = $esDni ? 'dni' : 'email';
        $valor = $esDni ? $dni : $texto;
        $credencialIncorrecta = $esDni ? 'DNI o contraseña incorrectos.' : 'Email o contraseña incorrectos.';

        $clave = 'login:'.$request->ip().'|'.$valor;
        if (RateLimiter::tooManyAttempts($clave, self::MAX_INTENTOS)) {
            $segundos = RateLimiter::availableIn($clave);

            return $this->error("Demasiados intentos. Probá de nuevo en {$segundos} segundos.", 429);
        }

        // 1) Administrador de la plataforma
        $admin = Administrador::where($campo, $valor)->first();
        if ($admin && Hash::check($datos['password'], $admin->password)) {
            if (! $admin->activo) {
                return $this->error('Tu usuario está desactivado.', 403);
            }
            RateLimiter::clear($clave);
            Auth::guard('web')->logout();
            Auth::guard('plataforma')->login($admin);
            $request->session()->regenerate();
            $request->session()->forget('miembro_id');

            return response()->json(['sesion' => $this->sesionActual($request)]);
        }

        // 2) Persona de una cuenta
        $usuario = Usuario::where($campo, $valor)->first();
        if (! $usuario || ! Hash::check($datos['password'], $usuario->password)) {
            RateLimiter::hit($clave, self::BLOQUEO_SEGUNDOS);

            return $this->error($credencialIncorrecta, 422);
        }
        if (! $usuario->activo) {
            return $this->error('Tu usuario está desactivado. Contactate con el administrador de la plataforma.', 403);
        }

        $membresias = $this->membresias($usuario->id);
        if ($membresias === []) {
            return $this->error('Tu usuario no tiene acceso activo a ningún consultorio. Hablá con el administrador del centro.', 403);
        }

        RateLimiter::clear($clave);
        Auth::guard('plataforma')->logout();
        Auth::guard('web')->login($usuario);
        $request->session()->regenerate();

        if (count($membresias) === 1) {
            $request->session()->put('miembro_id', $membresias[0]['id']);
        } else {
            $request->session()->forget('miembro_id');
        }

        return response()->json(['sesion' => $this->sesionActual($request)]);
    }

    /** La persona elige con qué cuenta (membresía) trabaja. */
    public function elegirCentro(Request $request): JsonResponse
    {
        $datos = $request->validate(['miembroId' => ['required']]);
        $usuario = Auth::guard('web')->user();
        if (! $usuario) {
            return $this->error('Tu sesión terminó. Volvé a ingresar.', 401);
        }

        $miembroId = (string) $datos['miembroId'];
        $existe = collect($this->membresias($usuario->id))->contains(fn ($m) => $m['id'] === $miembroId);
        if (! $existe) {
            return $this->error('No tenés acceso a ese centro.', 403);
        }

        $request->session()->put('miembro_id', $miembroId);

        return response()->json(['sesion' => $this->sesionActual($request)]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        Auth::guard('plataforma')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['sesion' => null]);
    }

    // ---------------------------------------------------------------------

    private function sesionActual(Request $request): ?array
    {
        $admin = Auth::guard('plataforma')->user();
        if ($admin instanceof Administrador) {
            if (! $admin->activo) {
                Auth::guard('plataforma')->logout();

                return null;
            }

            return [
                'tipo' => 'admin',
                'admin' => [
                    'id' => (string) $admin->id,
                    'nombre' => $admin->nombre,
                    'email' => $admin->email,
                    'dni' => $admin->dni,
                    'rol' => $admin->rol,
                ],
            ];
        }

        $usuario = Auth::guard('web')->user();
        if ($usuario instanceof Usuario) {
            if (! $usuario->activo) {
                Auth::guard('web')->logout();

                return null;
            }
            $membresias = $this->membresias($usuario->id);
            $miembroId = $request->session()->get('miembro_id');
            $vigente = collect($membresias)->contains(fn ($m) => $m['id'] === $miembroId);

            return [
                'tipo' => 'usuario',
                'usuario' => [
                    'id' => (string) $usuario->id,
                    'nombre' => $usuario->nombre,
                    'email' => $usuario->email,
                    'dni' => $usuario->dni,
                    'activo' => (bool) $usuario->activo,
                ],
                'membresias' => $membresias,
                'miembroId' => $vigente ? $miembroId : null,
            ];
        }

        return null;
    }

    /**
     * Membresías UTILIZABLES de una persona: activas y de cuentas activas (no
     * suspendidas ni dadas de baja), con la cuenta resuelta. Mismo formato que
     * usa el frontend (MiembroConCuenta).
     */
    private function membresias(int $usuarioId): array
    {
        $filas = DB::table('miembros as m')
            ->join('cuentas as c', 'c.id', '=', 'm.cuenta_id')
            ->join('planes as p', 'p.id', '=', 'c.plan_id')
            ->where('m.usuario_id', $usuarioId)
            ->where('m.activo', true)
            ->where('c.estado', 'activa')
            ->whereNull('c.deleted_at')
            ->orderBy('c.nombre')
            ->select([
                'm.id', 'm.cuenta_id', 'm.usuario_id', 'm.rol', 'm.profesional_id', 'm.activo',
                'c.tipo', 'c.nombre', 'c.slug', 'c.email_contacto', 'c.descripcion', 'c.banner_url',
                'c.estado', 'c.fecha_alta', 'c.horas_minimas_cancelacion', 'c.horas_vencimiento_pendiente',
                'p.nombre as plan',
            ])
            ->get();

        $agendas = DB::table('miembro_agendas')
            ->whereIn('miembro_id', $filas->pluck('id'))
            ->get()
            ->groupBy('miembro_id');

        return $filas->map(fn ($f) => [
            'id' => (string) $f->id,
            'cuentaId' => (string) $f->cuenta_id,
            'usuarioId' => (string) $f->usuario_id,
            'rol' => $f->rol,
            'profesionalId' => $f->profesional_id !== null ? (string) $f->profesional_id : null,
            'profesionalesAsignados' => ($agendas[$f->id] ?? collect())
                ->map(fn ($a) => (string) $a->profesional_id)->values()->all(),
            'activo' => (bool) $f->activo,
            'cuenta' => [
                'id' => (string) $f->cuenta_id,
                'tipo' => $f->tipo,
                'nombre' => $f->nombre,
                'slug' => $f->slug,
                'email' => $f->email_contacto,
                'descripcion' => $f->descripcion ?? '',
                'bannerUrl' => $f->banner_url,
                'estado' => $f->estado,
                'plan' => $f->plan,
                'fechaAlta' => $f->fecha_alta,
                'horasMinimasCancelacion' => (int) $f->horas_minimas_cancelacion,
                'horasVencimientoPendiente' => (int) $f->horas_vencimiento_pendiente,
            ],
        ])->values()->all();
    }

    private function error(string $mensaje, int $estado): JsonResponse
    {
        return response()->json(['message' => $mensaje], $estado);
    }
}
