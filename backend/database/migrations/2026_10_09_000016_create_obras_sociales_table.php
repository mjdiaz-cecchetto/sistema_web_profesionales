<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lista PROPIA de cada cuenta: con qué obras sociales trabaja el centro.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('obras_sociales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas')->cascadeOnDelete();
            $table->string('nombre', 120);
            $table->boolean('activo')->default(true)->comment('Inactiva = no se ofrece a pacientes');
            $table->timestamps();

            $table->unique(['cuenta_id', 'nombre']);
            $table->unique(['id', 'cuenta_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('obras_sociales');
    }
};
