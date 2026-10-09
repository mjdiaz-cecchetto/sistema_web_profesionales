<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Áreas que muestra la página pública del profesional.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('areas_atencion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('profesional_id')->constrained('profesionales')->cascadeOnDelete();
            $table->string('nombre', 120);
            $table->string('descripcion');
            $table->text('detalle')->nullable();
            $table->string('icono', 40);
            $table->unsignedTinyInteger('orden')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('areas_atencion');
    }
};
