<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Prestaciones reservables de cada profesional.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('servicios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas');
            $table->foreignId('profesional_id')->constrained('profesionales')->cascadeOnDelete();
            $table->string('nombre', 120);
            $table->text('descripcion')->nullable();
            $table->unsignedSmallInteger('duracion_minutos');
            $table->decimal('precio', 12, 2)->nullable()->comment('ARS · null = a consultar');
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index(['profesional_id', 'activo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servicios');
    }
};
