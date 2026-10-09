<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pivote: profesionales cuyas agendas gestiona una secretaría. Sin filas = todo el centro.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('miembro_agendas', function (Blueprint $table) {
            $table->foreignId('miembro_id')->constrained('miembros')->cascadeOnDelete();
            $table->foreignId('profesional_id')->constrained('profesionales')->cascadeOnDelete();

            $table->primary(['miembro_id', 'profesional_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('miembro_agendas');
    }
};
