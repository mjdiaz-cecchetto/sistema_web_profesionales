<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pivote: qué obras sociales de la cuenta atiende cada profesional. Particular no es una fila: es profesionales.acepta_particular.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profesional_obra_social', function (Blueprint $table) {
            $table->unsignedBigInteger('profesional_id');
            $table->unsignedBigInteger('obra_social_id');
            $table->unsignedBigInteger('cuenta_id');

            $table->primary(['profesional_id', 'obra_social_id']);
            $table->index('obra_social_id');
            $table->index('cuenta_id');

            // FK compuestas: profesional y obra social tienen que ser de la misma cuenta.
            $table->foreign(['profesional_id', 'cuenta_id'])->references(['id', 'cuenta_id'])->on('profesionales')->cascadeOnDelete();
            $table->foreign(['obra_social_id', 'cuenta_id'])->references(['id', 'cuenta_id'])->on('obras_sociales')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profesional_obra_social');
    }
};
