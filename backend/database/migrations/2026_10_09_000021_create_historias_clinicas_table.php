<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dato sensible: solo la lee y escribe el profesional que la cargó. No se borra.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historias_clinicas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas');
            $table->foreignId('paciente_id')->constrained('pacientes')->restrictOnDelete();
            $table->unsignedBigInteger('profesional_id');
            $table->foreignId('turno_id')->nullable()->constrained('turnos')->nullOnDelete();
            $table->date('fecha');
            $table->string('motivo');
            $table->text('diagnostico');
            $table->text('tratamiento');
            $table->timestamps();

            $table->foreign(['profesional_id', 'cuenta_id'])->references(['id', 'cuenta_id'])->on('profesionales')->restrictOnDelete();
            $table->index(['paciente_id', 'profesional_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historias_clinicas');
    }
};
