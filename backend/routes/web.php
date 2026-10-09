<?php

use App\Http\Controllers\Auth\SesionController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

/*
 * API del panel. Usa el grupo `web` (sesión por cookie + protección CSRF):
 * el frontend la llama por el mismo dominio (/api), así que no hace falta
 * CORS ni tokens. Angular manda solo el header X-XSRF-TOKEN.
 */
Route::prefix('api/auth')->controller(SesionController::class)->group(function () {
    Route::get('sesion', 'mostrar');
    Route::post('login', 'login');
    Route::post('centro', 'elegirCentro');
    Route::post('logout', 'logout');
});
