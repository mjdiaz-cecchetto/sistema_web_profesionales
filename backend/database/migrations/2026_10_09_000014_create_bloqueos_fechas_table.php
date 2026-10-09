<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Vacaciones, congresos, feriados propios.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bloqueos_fechas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('profesional_id')->constrained('profesionales')->cascadeOnDelete();
            $table->date('fecha_desde');
            $table->date('fecha_hasta');
            $table->string('motivo')->nullable();
            $table->timestamps();

            $table->index(['profesional_id', 'fecha_desde', 'fecha_hasta']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE bloqueos_fechas ADD CONSTRAINT chk_bloqueos_rango CHECK (fecha_hasta >= fecha_desde)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bloqueos_fechas');
    }
};
