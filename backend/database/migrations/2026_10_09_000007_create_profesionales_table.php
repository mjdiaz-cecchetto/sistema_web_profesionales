<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Perfil profesional (agenda + página pública). No es un login: se vincula a una persona por miembros.profesional_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profesionales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas')->cascadeOnDelete();
            $table->foreignId('especialidad_id')->nullable()->constrained('especialidades')->nullOnDelete();
            $table->string('nombre', 150)->comment('Nombre público, con título (Lic., Dra.)');
            $table->string('titulo', 150)->nullable();
            $table->string('whatsapp', 20)->nullable()->comment('Formato internacional sin +');
            $table->string('avatar_url')->nullable();
            $table->string('banner_url')->nullable();
            $table->string('frase_principal', 200)->nullable();
            $table->text('biografia')->nullable();
            $table->string('modalidad')->nullable();
            $table->boolean('acepta_particular')->default(true)->comment('false = no atiende pacientes sin obra social');
            $table->boolean('activo')->default(true)->comment('Cuenta para el límite del plan');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['cuenta_id', 'activo']);
            $table->unique(['id', 'cuenta_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profesionales');
    }
};
