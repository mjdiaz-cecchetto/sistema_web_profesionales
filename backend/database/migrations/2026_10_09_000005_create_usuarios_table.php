<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Personas con acceso al panel. Una persona = un login, aunque trabaje en varias cuentas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->string('dni', 9)->unique()->comment('Credencial principal');
            $table->string('email', 190)->unique()->comment('Credencial alternativa, avisos y recuperación');
            $table->string('password');
            $table->boolean('activo')->default(true)->comment('false = no entra a ninguna cuenta');
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
