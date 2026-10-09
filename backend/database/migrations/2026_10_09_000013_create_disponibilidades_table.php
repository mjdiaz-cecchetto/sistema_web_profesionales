<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Horario semanal: 7 filas por profesional.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('disponibilidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('profesional_id')->constrained('profesionales')->cascadeOnDelete();
            $table->unsignedTinyInteger('dia_semana')->comment('0 = domingo … 6 = sábado');
            $table->boolean('activo')->default(false);
            $table->json('horarios')->comment('Ej. ["09:00","10:00"]');

            $table->unique(['profesional_id', 'dia_semana']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disponibilidades');
    }
};
