<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Equipo interno de la plataforma (/gestion). Login y guard separados de las personas de las cuentas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('administradores', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->string('email', 190)->unique();
            $table->string('dni', 9)->nullable()->unique()->comment('Credencial alternativa al email');
            $table->string('password');
            $table->enum('rol', ['administrador', 'soporte', 'facturacion'])->default('administrador');
            $table->boolean('activo')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('administradores');
    }
};
