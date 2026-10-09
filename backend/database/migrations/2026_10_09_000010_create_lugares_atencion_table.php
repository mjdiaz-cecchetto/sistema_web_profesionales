<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sedes o modalidades donde atiende cada profesional.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lugares_atencion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('profesional_id')->constrained('profesionales')->cascadeOnDelete();
            $table->string('nombre', 100);
            $table->string('detalle', 150)->nullable();
            $table->string('direccion');
            $table->string('link_mapa')->nullable();
            $table->string('icono', 40)->comment('Clave de ícono, no el path SVG');
            $table->unsignedTinyInteger('orden')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lugares_atencion');
    }
};
