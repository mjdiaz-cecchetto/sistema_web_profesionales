<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Membresía persona ↔ cuenta con su rol.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('miembros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->enum('rol', ['administrador', 'secretaria', 'profesional']);
            $table->foreignId('profesional_id')->nullable()->constrained('profesionales')->nullOnDelete()
                ->comment('Obligatorio si rol = profesional; opcional en administrador (atiende)');
            $table->boolean('activo')->default(true)->comment('Acceso a ESTA cuenta');
            $table->timestamps();

            $table->unique(['cuenta_id', 'usuario_id']);
            $table->unique('profesional_id');
            $table->index('usuario_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('miembros');
    }
};
