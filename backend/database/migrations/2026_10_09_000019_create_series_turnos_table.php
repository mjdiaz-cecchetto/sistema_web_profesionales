<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Series para autorizaciones de obra social (semanal, quincenal, mensual).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('series_turnos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas');
            $table->foreignId('profesional_id')->constrained('profesionales');
            $table->foreignId('paciente_id')->constrained('pacientes');
            $table->enum('frecuencia', ['semanal', 'quincenal', 'mensual']);
            $table->unsignedSmallInteger('cantidad_sesiones');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('series_turnos');
    }
};
