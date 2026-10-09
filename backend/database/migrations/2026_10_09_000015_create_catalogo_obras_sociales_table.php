<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de la plataforma (OSDE, IOMA, PAMI…). Solo sugiere nombres al cargar: no se referencia desde los turnos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalogo_obras_sociales', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 120)->unique();
            $table->boolean('activo')->default(true)->comment('Inactiva = deja de sugerirse');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalogo_obras_sociales');
    }
};
